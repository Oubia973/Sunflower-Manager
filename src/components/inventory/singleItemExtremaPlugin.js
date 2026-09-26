export function getSingleItemExtrema(chart) {
  const visible = chart.data.datasets.map((dataset, index) => ({ dataset, index }))
    .filter(({ dataset, index }) => dataset.kind !== "quantity" && dataset.type !== "bar" && chart.isDatasetVisible(index));
  if (visible.length !== 1) return null;
  const { dataset, index } = visible[0];
  const meta = chart.getDatasetMeta(index);
  const points = meta.data.map((element, pointIndex) => ({ element, ...meta.controller.getParsed(pointIndex) }))
    .filter(({ x, y }) => Number.isFinite(x) && Number.isFinite(y) && x >= chart.scales.x.min && x <= chart.scales.x.max);
  if (!points.length) return null;
  const min = points.reduce((a, b) => b.y < a.y ? b : a);
  const max = points.reduce((a, b) => b.y > a.y ? b : a);
  return { dataset, min, max, amplitude: min.y > 0 ? (max.y - min.y) / min.y * 100 : null };
}

export const singleItemExtremaPlugin = {
  id: "singleItemExtrema",
  afterDatasetsDraw(chart, args, options) {
    const extrema = getSingleItemExtrema(chart);
    if (!extrema) return;
    const { min, max, amplitude } = extrema;
    const { ctx, chartArea: area } = chart;
    const format = options.formatValue || String;
    const unit = options.unit ? ` ${options.unit}` : "";
    ctx.save();
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";
    const label = (text, x, y, align = "left") => {
      const width = ctx.measureText(text).width;
      const left = align === "center" ? x - width / 2 : x;
      ctx.fillStyle = "rgba(25, 19, 16, 0.9)";
      ctx.fillRect(left - 4, y - 10, width + 8, 20);
      ctx.fillStyle = "#f3dcc0";
      ctx.textAlign = align;
      ctx.fillText(text, x, y);
    };
    const levels = min.y === max.y ? [["Min / Max", min]] : [["Max", max], ["Min", min]];
    levels.forEach(([name, point]) => {
      const { x, y } = point.element.getProps(["x", "y"]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      ctx.strokeStyle = "rgba(243, 220, 192, 0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(area.left, y);
      ctx.lineTo(area.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe1aa";
      ctx.fill();
      label(`${name} ${format(point.y)}${unit}`, area.left + 8, Math.max(area.top + 12, Math.min(area.bottom - 12, y + (name === "Max" ? 15 : -15))));
    });
    label(`Min to max: ${amplitude == null ? "N/A" : `${amplitude.toFixed(1)}%`}`, (area.left + area.right) / 2, area.top + 12, "center");
    ctx.restore();
  },
};
