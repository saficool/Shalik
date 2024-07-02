import { Injectable } from '@angular/core';
import { ChatOpenAI } from "@langchain/openai";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { GraphLink, KnowledgeGraphData } from '../interfaces/knowledge-graph.interface';

const SYSTEM_PROMPT = `Generate a knowledge graph based on the given information.\n
The output should be in valid JSON format and match the specified schema.\n
Each node must have at least one relation with another node, and the relationships should capture both direct and indirect connections.`

type KnowledgeGraphDataType = {
  nodes: GraphNodeType[]
  links: GraphLinkType[]
}
type GraphNodeType = {
  id: number;
  label: string;
  type?: string;
}
type GraphLinkType = {
  source: number;
  target: number;
  type?: string;
}
const parser = new JsonOutputParser<KnowledgeGraphDataType>();
const formatInstructions = `Respond only in valid JSON. The JSON object you return should match the following schema:
{nodes:[{id: "number", label: "string", type: "string"}],links:[{source: "number", target: "number", type: "string"}]}`;


@Injectable({
  providedIn: 'root'
})
export class KnowledgeGraphService {
  private llmGraphChain: any

  constructor() { }

  public async initGraphLLM(apiKey: string): Promise<void> {
    const prompt = await ChatPromptTemplate.fromMessages([
      ["system", SYSTEM_PROMPT + "\n\n{format_instructions}",],
      ["human", "{query}"],
    ]).partial({ format_instructions: formatInstructions });
    const llm = new ChatOpenAI({ apiKey: apiKey, temperature: 0 });
    this.llmGraphChain = prompt.pipe(llm).pipe(parser);
  }

  public async generateGraph(query: string): Promise<KnowledgeGraphData> {
    console.log(query)
    const result = await this.llmGraphChain.invoke({ query });
    return await this.formatGraphData(result).then((data: KnowledgeGraphData) => { return data })
  }

  // ---------------------------------------------------------------- //

  private async formatGraphData(graphData: KnowledgeGraphDataType): Promise<KnowledgeGraphData> {
    const links = graphData.links.map(m => { const x: GraphLink = { source: m.source, target: m.target, type: m.type, curvature: this.getRandomNumber() }; return x; })
    const knowledgeGraphData: KnowledgeGraphData = {
      nodes: graphData.nodes,
      links: links
    }
    return knowledgeGraphData
  }

  private getRandomNumber(): number {
    // const randomNumber = Math.random() * 2 - 1;
    // return Math.round(randomNumber * 100) / 100;
    return 0
  }

  public nodeCanvasObject(node: any, ctx: CanvasRenderingContext2D, globalScale: number) {
    const label: string = node.label as string;
    const fontSize = 16 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(node.x! - bckgDimensions[0] / 2, node.y! - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = node.color;
    ctx.fillText(label, node.x!, node.y!);

    node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
  }

  public nodePointerAreaPaint(node: any, color: string, ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = color;
    const bckgDimensions = node.__bckgDimensions;
    bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
  }

  public linkCanvasObject(link: any, ctx: CanvasRenderingContext2D) {
    const MAX_FONT_SIZE = 4;
    const LABEL_NODE_MARGIN = 8 * 1.5;

    const start = link.source;
    const end = link.target;

    // ignore unbound links
    if (typeof start !== 'object' || typeof end !== 'object') return;

    // calculate label positioning
    const textPos = Object.assign({}, ...['x', 'y'].map(c => ({ [c]: start[c] + (end[c] - start[c]) / 2 })));

    const relLink = { x: end.x - start.x, y: end.y - start.y };

    const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2;

    let textAngle = Math.atan2(relLink.y, relLink.x);
    // maintain label vertical orientation for legibility
    if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
    if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

    const label = link.type;

    // estimate fontSize to fit in link length
    ctx.font = '1px Sans-Serif';
    const fontSize = Math.min(MAX_FONT_SIZE, maxTextLength / ctx.measureText(label).width);
    ctx.font = `${fontSize}px Sans-Serif`;
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); // some padding

    // draw text label (with background rect)
    ctx.save();
    ctx.translate(textPos.x, textPos.y);
    ctx.rotate(textAngle);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(- bckgDimensions[0] / 2, - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'darkgrey';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  }
}
