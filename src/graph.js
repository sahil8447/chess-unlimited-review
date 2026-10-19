import {formatEvaluation,evaluationChance} from './evaluation.js';

export function createEvaluationGraph(
  graphData,
  reviewedMoves,
  onSelectMove
) {
  const NS = "http://www.w3.org/2000/svg";

  const container = document.createElement("div");
  container.className = "chess-evaluation-graph";

  const heading = document.createElement("h3");
  heading.textContent = "Evaluation Graph";

  const selectedLabel = document.createElement("div");
  selectedLabel.className = "chess-graph-selection";
  selectedLabel.textContent = "Select a move on the graph";

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 600 220");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    "Chess position evaluation graph"
  );

  const width = 600;
  const height = 220;
  const padding = 20;

  // Compress large evaluations so mate scores
  // don't flatten the rest of the graph.
  function normalize(cp) {
    return Math.tanh(cp / 500);
  }

  const x = ply =>
    padding +
    (ply / Math.max(1, graphData.length - 1)) *
    (width - padding * 2);

  const y = cp =>
    height / 2 -
    normalize(cp) * (height / 2 - padding);

  function addSvgElement(tag, attributes, parent = svg) {
    const element = document.createElementNS(NS, tag);

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }

    parent.appendChild(element);
    return element;
  }

  // Draw horizontal guide lines.
  for (const cp of [-500, -200, 0, 200, 500]) {
    addSvgElement("line", {
      x1: padding,
      x2: width - padding,
      y1: y(cp),
      y2: y(cp),
      stroke: cp === 0 ? "#999" : "#484641",
      "stroke-width": cp === 0 ? 1.5 : 1,
      "stroke-dasharray": cp === 0 ? "none" : "4 4"
    });
  }

  const points = graphData.map(point => ({
    x: x(point.ply),
    y: point.evaluation && point.evaluation.kind!=='cp' ? height/2-((evaluationChance(point.evaluation)??.5)*2-1)*(height/2-padding) : y(point.whiteCp),
    ply: point.ply,
    cp: point.whiteCp,
    label: point.evaluation?formatEvaluation(point.evaluation):`${point.whiteCp>=0?"+":""}${(point.whiteCp/100).toFixed(2)}`
  }));

  const pathData = points.map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  ).join(" ");

  addSvgElement("path", {
    d: pathData,
    fill: "none",
    stroke: "#81b64c",
    "stroke-width": 3,
    "stroke-linejoin": "round",
    "stroke-linecap": "round"
  });

  const circles = [];

  for (const point of points) {
    const move = reviewedMoves[point.ply - 1];

    const gradeColors = {
      book: "#b7a7ce",
      miss: "#f16b6b",
      best: "#81b64c",
      excellent: "#81b64c",
      good: "#96af8b",
      inaccuracy: "#f0c15c",
      mistake: "#e69b50",
      blunder: "#e05252",
      brilliant: "#1baca6",
      great: "#5c8bb0"
    };

    const circle = addSvgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: point.ply === 0 ? 3 : 5,
      fill: move
        ? gradeColors[move.grade] || "#81b64c"
        : "#aaa",
      stroke: "#242320",
      "stroke-width": 2,
      tabindex: 0,
      role: "button",
      "aria-label": point.ply === 0
        ? "Starting position"
        : `Move ${point.ply}, evaluation ${point.label}`
    });

    const select = () => {
      circles.forEach(c =>
        c.setAttribute("stroke", "#242320")
      );

      circle.setAttribute("stroke", "#ffffff");

      selectedLabel.textContent =
        point.ply === 0
          ? "Starting position"
          : `Move ${point.ply}: ${move.san} | ` +
            `Evaluation: ${point.label}`;

      onSelectMove?.(point.ply);
    };

    circle.addEventListener("click", select);

    circle.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });

    circles.push(circle);
  }

  container.append(heading, svg, selectedLabel);

  return container;
}
