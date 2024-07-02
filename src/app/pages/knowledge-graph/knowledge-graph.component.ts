import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { GraphConfig, KnowledgeGraphData } from '../../interfaces/knowledge-graph.interface';
import { KnowledgeGraphService } from '../../services/knowledge-graph.service';
import { CommonService } from '../../services/common.service';
import { LocalStorageManagerService } from '../../services/local-storage-manager.service';
import ForceGraph, { LinkObject, NodeObject } from 'force-graph';
import { FormsModule } from "@angular/forms"
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './knowledge-graph.component.html',
  styleUrl: './knowledge-graph.component.scss'
})
export class KnowledgeGraphComponent {
  @ViewChild('graphCardBody', { static: false }) graphCardBody!: ElementRef;
  @ViewChild('inputText', { static: false }) inputText!: ElementRef<HTMLTextAreaElement>
  protected loading: boolean = false

  private graphConfig: GraphConfig = { width: 450, height: 450 }
  private Graph: any
  protected graphData!: KnowledgeGraphData
  protected openai_api_key: string = ""
  protected api_input_field_type: string = 'password'

  //Dependency injection
  private knowledgeGraphService = inject(KnowledgeGraphService)
  private commonService = inject(CommonService)
  private localStorageManagerService = inject(LocalStorageManagerService)


  ngOnInit(): void {
    this.getOpenAiKey()
  }

  ngAfterViewInit(): void {
    this.initGraphLLM()
    this.setGraphDimension()
  }

  protected saveOpenAiKey() {
    if (this.openai_api_key) {
      this.localStorageManagerService.setItem('openai_api_key', this.openai_api_key)
    }
    else {
      this.localStorageManagerService.removeItem('openai_api_key')
    }
  }

  private getOpenAiKey() {
    this.openai_api_key = this.localStorageManagerService.getItem('openai_api_key') || ""
  }
  protected togglekeyVisibility() {
    if (this.api_input_field_type == 'text') {
      this.api_input_field_type = 'password'
    }
    else {
      this.api_input_field_type = 'text'
    }
  }

  private initGraphLLM() {
    if (this.openai_api_key) {
      this.knowledgeGraphService.initGraphLLM(this.openai_api_key)
    }
  }

  private setGraphDimension() {
    const divElement = this.graphCardBody.nativeElement;
    this.graphConfig = { width: divElement.offsetWidth - 8, height: divElement.offsetHeight - 8 }
    this.initGrpah()
  }

  private async initGrpah(): Promise<void> {
    const _graph = document.getElementById('graph')!
    this.Graph = ForceGraph()(_graph);
    this.Graph
      .width(this.graphConfig.width)
      .height(this.graphConfig.height)
      .nodeId('id')
      .nodeLabel('label')
      .nodeAutoColorBy('type')
      .nodeCanvasObject((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => { this.knowledgeGraphService.nodeCanvasObject(node, ctx, globalScale) })
      .nodePointerAreaPaint((node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => { this.knowledgeGraphService.nodePointerAreaPaint(node, color, ctx) })
      .onNodeClick((node: NodeObject) => { this.Graph.centerAt(node.x, node.y, 1000); this.Graph.zoom(8, 2000); })
      .linkDirectionalArrowLength(4)
      .linkDirectionalArrowRelPos(1)
      .linkCurvature('curvature')
      .linkCanvasObjectMode(() => 'after')
      .linkCanvasObject((link: LinkObject, ctx: CanvasRenderingContext2D) => { this.knowledgeGraphService.linkCanvasObject(link, ctx) })

  }


  protected async generateGraph(): Promise<void> {
    await this.initGrpah()
    await this.getGraphdata()
    await this.setGraphdata()
  }

  private async getGraphdata(): Promise<void> {
    const inputText: string = this.inputText.nativeElement.value.trim()
    if (inputText) {
      this.loading = true
      await this.knowledgeGraphService.generateGraph(inputText)
        .then((data: KnowledgeGraphData) => { this.graphData = data; this.loading = false })
    }
  }

  private async setGraphdata(): Promise<void> {
    this.Graph.graphData(this.graphData)
      .linkAutoColorBy((d: any) => {
        var node = this.graphData.nodes.find(f => f.id == d.source)
        if (node) {
          return node.type
        }
        else {
          return 'other'
        }
      }
      )
  }

  protected clearText() {
    this.inputText.nativeElement.value = ''
    this.initGrpah()
  }

  protected fitGraphToCanvas() {
    this.Graph.zoomToFit(500)
  }

  protected screenshotGraph() {
    var node = document.getElementById('graph')!;
    this.commonService.htmlToImageCopy(node)
  }
}
