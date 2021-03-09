<template>
  <div id="graph" :style="style">
    <canvas ref="canvas" :height="height" :width="width"></canvas>
  </div>
</template>

<script lang="ts">
  import {
    ForceCollide,
    ForceLink,
    ForceX,
    ForceY,
    Simulation,
    SimulationLinkDatum,
    SimulationNodeDatum,
    ZoomTransform,
  } from 'd3';
  import { strToRGB } from '@/utils';

  interface NodeDatum extends SimulationNodeDatum {
    id: string;
    name: string;
    tags: string[];
    radius: number;
    innerRadius?: number;
    alpha?: number;
  }

  interface LinkDatum extends SimulationLinkDatum<NodeDatum> {
    source: NodeDatum;
    target: NodeDatum;
    alpha?: number;
  }

  type TPoint = [number, number];

  enum EColor {
    white = '#ffffff',
    red = '#ff3264',
    gray = '#8d8d8d',
  }

  @vno.VPD.Component({ el: '#graph' })
  export default class Graph extends vno.Vue {
    // noinspection JSUnusedGlobalSymbols
    $refs!: {
      canvas: HTMLCanvasElement;
    };

    isLoading = true;
    loadingText = vno.getMessage('loading');

    isError = false;
    errorText = vno.getMessage('components.graph.error');

    width = 0;
    height = 700;

    PI_2 = Math.PI * 2;
    PI_HALF = Math.PI / 2;

    nodeRadiusUnit = 2;
    nodeMinRadius = 8;
    nodeMaxRadius = this.nodeMinRadius + this.nodeRadiusUnit * 46;

    linkWidth = 4;
    halfLinkWidth = this.linkWidth / 2;

    linkArrowLength = 10;
    linkArrowAngle = Math.PI / 16;
    linkArrowLengthSin = this.linkArrowLength * Math.sin(this.linkArrowAngle);
    linkArrowLengthCos = this.linkArrowLength * Math.cos(this.linkArrowAngle);
    linkArrowLengthSin2 = this.linkArrowLengthSin * 2;

    canvasAlpha = 0.2;
    interpolate = 0;

    canvasCtx!: CanvasRenderingContext2D;
    simulation!: Simulation<NodeDatum, LinkDatum>;
    transform!: ZoomTransform;

    nodes: NodeDatum[] = [];
    links: LinkDatum[] = [];
    linkCount: Dict<[string[], string[]]> = {};

    readyUnselect = false;
    selectedNodeOrLink: NodeDatum | LinkDatum | null = null;

    draggedLinkSourceOffsetXY: TPoint | null = null;
    draggedLinkTargetOffsetXY: TPoint | null = null;

    get style() {
      return {
        width: `${this.width}px`,
        height: `${this.height}px`,
      };
    }

    get selectedNode() {
      return this.selectedNodeOrLink as NodeDatum;
    }

    get selectedLink() {
      return this.selectedNodeOrLink as LinkDatum;
    }

    get isSelectedNode() {
      return !!(this.selectedNodeOrLink && !this.selectedLink.source);
    }

    get isSelectedLink() {
      return !!(this.selectedNodeOrLink && this.selectedLink.source);
    }

    get selectedLinkNodeIndices() {
      return [this.selectedLink.source.index, this.selectedLink.target.index];
    }

    get selectedLinkCount() {
      return this.linkCount[this.selectedNode.id];
    }

    get centerXY(): TPoint {
      return [this.width / 2, this.height / 2];
    }

    // noinspection JSUnusedGlobalSymbols
    created() {
      const article = document.querySelector('article')!;
      const setWidth = () => {
        this.width = article.clientWidth - 16;
      };
      setWidth();
      window.onresize = setWidth;
    }

    // noinspection JSUnusedGlobalSymbols
    async mounted() {
      const canvas = this.$refs.canvas;
      this.canvasCtx = canvas.getContext('2d')!;
      this.ticked();

      if ((await vno.waitFor(() => d3)) === undefined) {
        this.isError = true;
        this.ticked();
        return;
      }

      this.transform = d3.zoomIdentity;

      this.$watch('width', () => {
        const [x, y] = this.transformXY(...this.centerXY);
        this.forceXY(x, y, true);
        this.restartSimulationWithAlpha();
      });
      this.$watch('selectedNodeOrLink', () => {
        this.interpolate = 0;
        this.restartSimulationWithAlpha(false, 0.1);
      });

      this.simulation = d3.forceSimulation(this.nodes)
          .force('charge', d3.forceManyBody<NodeDatum>().strength(node => {
            return -Math.log2(this.nodeMaxRadius - node.radius + 2) * 100;
          }))
          .force('link', d3.forceLink<NodeDatum, LinkDatum>(this.links).id(node => node.id))
          .on('tick', this.ticked);
      this.forceXY(...this.centerXY);
      this.forceCollide();

      d3.select(canvas)
          .call(d3.drag<HTMLCanvasElement, unknown>()
              .subject(this.dragSubject)
              .on('start', this.dragStarted)
              .on('drag', () => this.dragged())
              .on('end', this.dragEnded))
          .call(d3.zoom<HTMLCanvasElement, unknown>()
              .scaleExtent([1 / 10, 10])
              .on('zoom', this.zoomed))
          .on('mousemove', this.mouseMoved);

      this.initNodes().then();
    }

    async initNodes() {
      const { files } = await vno.file.getFiles();
      const nodeDict: Dict<NodeDatum | undefined> = {};
      for (const path of Object.keys(files)) {
        if (nodeDict[path] === undefined) {
          await this.createNodeFromFile(path, files, nodeDict);
        }
      }
      this.isLoading = false;
    }

    async createNodeFromFile(path: string, files: Dict<IFile | undefined>, nodeDict: Dict<NodeDatum | undefined>) {
      let file = files[path];
      if (file === undefined) {
        file = await vno.file.getFile(path);
      }
      const source = this.addNode(path, file.flags.title, file.flags.tags);
      nodeDict[path] = source;
      for (const targetPath of Object.keys(file.links)) {
        const link = file.links[targetPath];
        if (!link.isMarkdown) {
          continue;
        }
        let target = nodeDict[targetPath];
        if (target === undefined) {
          target = await this.createNodeFromFile(targetPath, files, nodeDict);
        }
        this.addLink(source, target);
      }
      return source;
    }

    forceXY(x: number, y: number, isReForce = false) {
      if (isReForce) {
        this.simulation.force<ForceX<NodeDatum>>('x')!.x(x);
        this.simulation.force<ForceY<NodeDatum>>('y')!.y(y);
        return;
      }
      this.simulation.force('x', d3.forceX(x));
      this.simulation.force('y', d3.forceY(y));
    }

    forceCollide(isReForce = false) {
      const radius = (node: NodeDatum) => node.radius + this.nodeRadiusUnit * 10;
      if (isReForce) {
        this.simulation.force<ForceCollide<NodeDatum>>('collide')!.radius(radius);
        return;
      }
      this.simulation.force('collide', d3.forceCollide<NodeDatum>().radius(radius));
    }

    ticked() {
      this.canvasCtx.lineWidth = this.linkWidth;
      this.canvasCtx.textAlign = 'center';

      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, this.width, this.height);

      if (this.isLoading) {
        this.canvasCtx.font = '80px sans-serif';
        if (this.isError) {
          this.canvasCtx.fillStyle = EColor.red;
        }
        this.canvasCtx.fillText(this.isError ? this.errorText : this.loadingText, ...this.centerXY);
      } else {
        this.canvasCtx.translate(this.transform.x, this.transform.y);
        this.canvasCtx.scale(this.transform.k, this.transform.k);

        this.links.forEach(link => this.drawLink(link));
        this.nodes.forEach(node => this.drawNode(node));
      }

      this.canvasCtx.restore();
      this.increaseInterpolate();
    }

    drawLink(link: LinkDatum) {
      let isSelected = false;
      const linkSource = link.source;
      const linkTarget = link.target;
      const linkSourceIndex = linkSource.index;
      const linkTargetIndex = linkTarget.index;
      if (this.isSelectedLink) {
        const selectSourceIndex = this.selectedLink.source.index;
        const selectTargetIndex = this.selectedLink.target.index;
        if (selectSourceIndex === linkSourceIndex && selectTargetIndex === linkTargetIndex ||
            selectSourceIndex === linkTargetIndex && selectTargetIndex === linkSourceIndex) {
          isSelected = true;
        }
      } else if (this.isSelectedNode && [linkSourceIndex, linkTargetIndex].includes(this.selectedNode.index)) {
        isSelected = true;
      }
      this.drawLinkFrom(linkSource, linkTarget, isSelected, link);
    }

    drawLinkFrom(source: NodeDatum, target: NodeDatum, isSelected: boolean, link: LinkDatum) {
      const linkAngle = Math.atan2(target.y! - source.y!, target.x! - source.x!);
      const sinLinkAngle = Math.sin(linkAngle);
      const cosLinkAngle = Math.cos(linkAngle);

      let offsetSourceRadius = source.radius;
      const sourceLinkCount = this.linkCount[source.id];
      if (sourceLinkCount[0].includes(target.id) && sourceLinkCount[1].includes(target.id)) {
        offsetSourceRadius += this.linkArrowLengthCos;
      }
      const offsetSourceX = source.x! + offsetSourceRadius * cosLinkAngle;
      const offsetSourceY = source.y! + offsetSourceRadius * sinLinkAngle;

      const offsetTargetRadius = target.radius + this.linkArrowLengthCos;
      const offsetTargetX = target.x! - offsetTargetRadius * cosLinkAngle;
      const offsetTargetY = target.y! - offsetTargetRadius * sinLinkAngle;

      this.drawWithAlpha(() => {
        this.strokeWithColor(() => {
          this.canvasCtx.moveTo(offsetSourceX, offsetSourceY);
          this.canvasCtx.lineTo(offsetTargetX, offsetTargetY);
        }, EColor.gray);
        this.drawLinkArrow(target, linkAngle, sinLinkAngle, cosLinkAngle);
      }, isSelected ? 1 : this.canvasAlpha, link);
    }

    drawLinkArrow(target: NodeDatum, linkAngle: number, sinLinkAngle: number, cosLinkAngle: number) {
      const linkAngle2 = this.PI_HALF - linkAngle;
      const sinLinkAngle2 = Math.sin(linkAngle2);
      const tanLinkAngle2 = Math.tan(linkAngle2);

      const length = this.linkArrowLengthCos - this.linkArrowLengthSin / tanLinkAngle2;
      const offsetX1 = length * cosLinkAngle;
      const offsetY1 = this.linkArrowLengthSin / sinLinkAngle2 + length * sinLinkAngle;

      const offsetX2 = offsetX1 + this.linkArrowLengthSin2 * sinLinkAngle;
      const offsetY2 = offsetY1 - this.linkArrowLengthSin2 * cosLinkAngle;

      const offsetTargetX = target.x! - target.radius * cosLinkAngle;
      const offsetTargetY = target.y! - target.radius * sinLinkAngle;

      this.fillWithColor(() => {
        this.canvasCtx.moveTo(offsetTargetX, offsetTargetY);
        this.canvasCtx.lineTo(offsetTargetX - offsetX1, offsetTargetY - offsetY1);
        this.canvasCtx.lineTo(offsetTargetX - offsetX2, offsetTargetY - offsetY2);
      }, EColor.red);
    }

    drawNode(node: NodeDatum) {
      const halfRadius = node.radius / 2 - 1;
      let innerRadius = node.radius - 2;
      if (node.innerRadius === undefined) {
        node.innerRadius = innerRadius;
      }
      let isTransparent = false;

      if (this.isSelectedNode) {
        if (node.index === this.selectedNode.index) {
          innerRadius = 0;
        } else if (this.selectedLinkCount.flat().includes(node.id)) {
          innerRadius = halfRadius;
        } else {
          let sameTag = false;
          if (node.tags.length > 0) {
            for (const tag of this.selectedNode.tags) {
              if (node.tags.includes(tag)) {
                sameTag = true;
                break;
              }
            }
          } else if (this.selectedNode.tags.length === 0) {
            sameTag = true;
          }
          if (!sameTag) {
            isTransparent = true;
          }
        }
      } else if (this.isSelectedLink) {
        if (this.selectedLinkNodeIndices.includes(node.index)) {
          innerRadius = halfRadius;
        } else {
          isTransparent = true;
        }
      }

      if (node.innerRadius !== innerRadius) {
        innerRadius = d3.interpolate(node.innerRadius, innerRadius)(this.interpolate);
        node.innerRadius = innerRadius;
      }

      const text = node.name;
      const textX = node.x!;
      const textY = node.y! + node.radius + 12;
      if (text) {
        this.drawWithAlpha(() => {
          this.canvasCtx.strokeStyle = EColor.white;
          this.canvasCtx.strokeText(text, textX, textY);
        }, 1);
      }

      this.drawWithAlpha(() => {
        const tagCount = node.tags.length;
        const count = tagCount || 1;
        const perAngle = this.PI_2 / count;
        let startAngle = -perAngle;
        let endAngle = 0;
        for (let i = 0; i < count; i++) {
          this.fillWithColor(() => {
            this.canvasCtx.arc(node.x!, node.y!, node.radius, startAngle += perAngle, endAngle += perAngle);
            if (count > 1) {
              this.canvasCtx.lineTo(node.x!, node.y!);
            }
          }, strToRGB(tagCount > 0 ? node.tags[i] : 'Untagged'));
        }

        if (text) {
          this.canvasCtx.fillText(text, textX, textY);
        }
      }, isTransparent ? this.canvasAlpha : 1, node);

      this.drawWithAlpha(() => {
        this.fillWithColor(() => {
          this.canvasCtx.arc(node.x!, node.y!, innerRadius, 0, this.PI_2);
        }, EColor.white);
      }, 0.5);
    }

    strokeWithColor(stroke: () => void, color: string) {
      this.canvasCtx.strokeStyle = color;
      this.canvasCtx.beginPath();
      stroke();
      this.canvasCtx.stroke();
    }

    fillWithColor(fill: () => void, color: string) {
      this.canvasCtx.fillStyle = color;
      this.canvasCtx.beginPath();
      fill();
      this.canvasCtx.fill();
    }

    drawWithAlpha(draw: () => void, alpha: number, nodeOrLink?: NodeDatum | LinkDatum) {
      if (!nodeOrLink) {
        this.canvasCtx.globalAlpha = alpha;
        draw();
        return;
      }
      if (nodeOrLink.alpha === undefined) {
        nodeOrLink.alpha = this.canvasAlpha;
      }
      if (nodeOrLink.alpha !== alpha) {
        alpha = d3.interpolate(nodeOrLink.alpha, alpha)(this.interpolate);
        nodeOrLink.alpha = alpha;
      }
      this.canvasCtx.globalAlpha = alpha;
      draw();
    }

    increaseInterpolate() {
      let interpolate = this.interpolate;
      if (interpolate >= 1) {
        return;
      }
      interpolate += 0.05;
      this.interpolate = interpolate > 1 ? 1 : interpolate;
    }

    dragSubject() {
      let nodeOrLink: NodeDatum | LinkDatum | null = this.findNode();
      if (!nodeOrLink) {
        nodeOrLink = this.findLink();
      }
      if (!nodeOrLink) {
        return;
      }
      this.readyUnselect = this.selectedNodeOrLink === nodeOrLink;
      return nodeOrLink;
    }

    dragStarted() {
      if (!d3.event.active) {
        this.restartSimulationWithAlpha(true);
      }
      if (!this.readyUnselect) {
        this.selectedNodeOrLink = d3.event.subject;
      }
      this.dragged(true);
    }

    dragged(isFirst = false) {
      if (!isFirst && this.readyUnselect) {
        this.readyUnselect = false;
      }
      const [x, y] = this.getCanvasXY();
      if (this.isSelectedNode) {
        this.selectedNode.fx = x;
        this.selectedNode.fy = y;
        return;
      }
      if (!this.isSelectedLink) {
        return;
      }
      if (!this.draggedLinkSourceOffsetXY) {
        this.draggedLinkSourceOffsetXY = [this.selectedLink.source.x! - x, this.selectedLink.source.y! - y];
      }
      if (!this.draggedLinkTargetOffsetXY) {
        this.draggedLinkTargetOffsetXY = [this.selectedLink.target.x! - x, this.selectedLink.target.y! - y];
      }
      this.selectedLink.source.fx = x + this.draggedLinkSourceOffsetXY[0];
      this.selectedLink.source.fy = y + this.draggedLinkSourceOffsetXY[1];
      this.selectedLink.target.fx = x + this.draggedLinkTargetOffsetXY[0];
      this.selectedLink.target.fy = y + this.draggedLinkTargetOffsetXY[1];
    }

    dragEnded() {
      if (!d3.event.active) {
        this.resetSimulationAlphaTarget();
      }
      if (this.isSelectedNode) {
        this.selectedNode.fx = null;
        this.selectedNode.fy = null;
      } else if (this.isSelectedLink) {
        this.selectedLink.source.fx = null;
        this.selectedLink.source.fy = null;
        this.selectedLink.target.fx = null;
        this.selectedLink.target.fy = null;
        this.draggedLinkSourceOffsetXY = null;
        this.draggedLinkTargetOffsetXY = null;
      }
      if (this.readyUnselect) {
        this.selectedNodeOrLink = null;
      }
    }

    zoomed() {
      this.transform = d3.event.transform;
      this.ticked();
    }

    mouseMoved() {
      const node = this.findNode();
      this.canvasCtx.canvas.title = node ? node.id : '';
    }

    addNode(path: string, title: string, tags?: string[]) {
      this.linkCount[path] = [[], []];
      const node: NodeDatum = {
        x: this.centerXY[0],
        y: this.centerXY[1],
        id: path,
        name: title,
        tags: tags || [],
        radius: this.nodeMinRadius,
      };
      this.nodes.push(node);
      this.reloadNode();
      this.restartSimulationWithAlpha();
      return node;
    }

    addLink(source: NodeDatum, target: NodeDatum) {
      if (source.index === target.index) {
        return;
      }
      const [, sourceTargets] = this.linkCount[source.id];
      const [targetSources] = this.linkCount[target.id];
      if (sourceTargets.includes(target.id) || targetSources.includes(source.id)) {
        return;
      }
      sourceTargets.push(target.id);
      targetSources.push(source.id);
      this.links.push({ source, target } as LinkDatum);
      this.increaseRadius(source);
      this.interpolate = 0;
      this.reloadLink();
      this.restartSimulationWithAlpha();
    }

    reloadNode() {
      this.simulation.nodes(this.nodes);
    }

    reloadLink() {
      this.simulation.force<ForceLink<NodeDatum, LinkDatum>>('link')!.links(this.links);
    }

    increaseRadius(node: NodeDatum, value = this.nodeRadiusUnit) {
      let radius = node.radius;
      if (radius >= this.nodeMaxRadius) {
        return;
      }
      radius += value;
      if (radius > this.nodeMaxRadius) {
        radius = this.nodeMaxRadius;
      }
      node.radius = radius;
      this.forceCollide(true);
      this.restartSimulationWithAlpha();
    }

    restartSimulationWithAlpha(isTarget = false, alpha = 0.3) {
      if (isTarget) {
        this.resetSimulationAlphaTarget(alpha);
        this.simulation.restart();
        return;
      }
      this.simulation.alpha(alpha);
      this.simulation.restart();
    }

    resetSimulationAlphaTarget(alpha = 0) {
      this.simulation.alphaTarget(alpha);
    }

    getCanvasXY() {
      const [x, y] = d3.mouse(this.canvasCtx.canvas);
      return this.transformXY(x, y);
    }

    transformXY(x: number, y: number): TPoint {
      return [this.transform.invertX(x), this.transform.invertY(y)];
    }

    findNode() {
      const [x, y] = this.getCanvasXY();
      for (let i = this.nodes.length - 1; i >= 0; --i) {
        const node = this.nodes[i];
        const dx = x - node.x!;
        if (dx > node.radius || dx < -node.radius) {
          continue;
        }
        const dy = y - node.y!;
        if (dy > node.radius || dy < -node.radius) {
          continue;
        }
        const distSqr = dx * dx + dy * dy;
        const radiusSqr = node.radius * node.radius;
        if (distSqr <= radiusSqr) {
          return node;
        }
      }
      return null;
    }

    findLink() {
      const [x, y] = this.getCanvasXY();
      for (let i = this.links.length - 1; i >= 0; --i) {
        const link = this.links[i];
        const [minX, maxX] = [link.source.x!, link.target.x!].sort((a, b) => a - b);
        const offsetX = maxX - minX < this.linkWidth ? this.halfLinkWidth : 0;
        if (x > maxX + offsetX || x < minX - offsetX) {
          continue;
        }
        const [minY, maxY] = [link.source.y!, link.target.y!].sort((a, b) => a - b);
        const offsetY = maxY - minY < this.linkWidth ? this.halfLinkWidth : 0;
        if (y > maxY + offsetY || y < minY - offsetY) {
          continue;
        }
        const angle = Math.atan2(link.target.y! - link.source.y!, link.target.x! - link.source.x!);
        const angle2 = angle - this.PI_HALF;
        const k1 = Math.tan(angle2);
        const eq1 = k1 * (x - link.source.x!) - y + link.source.y!;
        const eq2 = k1 * (x - link.target.x!) - y + link.target.y!;
        if (eq1 < 0 === eq2 < 0) {
          continue;
        }
        const k2 = Math.tan(angle);
        const eq = k2 * (x - link.source.x!) - y + link.source.y!;
        const b = this.halfLinkWidth / Math.sin(angle2);
        const eq3 = eq + b;
        const eq4 = eq - b;
        if (eq3 < 0 !== eq4 < 0) {
          return link;
        }
      }
      return null;
    }
  }
</script>

<style lang="scss" scoped>@import "../styles/graph";</style>
