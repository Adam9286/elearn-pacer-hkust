import { useEffect, useRef, type CSSProperties } from "react";

type Props = { style?: CSSProperties };

const AmbientNetwork = ({ style = {} }: Props) => {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const nodes = [
      { x: 0.15, y: 0.3 },
      { x: 0.35, y: 0.15 },
      { x: 0.55, y: 0.4 },
      { x: 0.75, y: 0.2 },
      { x: 0.85, y: 0.6 },
      { x: 0.4, y: 0.7 },
      { x: 0.65, y: 0.8 },
      { x: 0.2, y: 0.6 },
    ];
    const edges: Array<[number, number]> = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [2, 5],
      [5, 6],
      [4, 6],
      [0, 7],
      [7, 5],
    ];
    const pkts = [
      { e: 0, t: 0, spd: 0.003, col: "#22d3ee" },
      { e: 2, t: 0.5, spd: 0.002, col: "#f97316" },
      { e: 6, t: 0.2, spd: 0.0025, col: "#22d3ee" },
    ];
    const W = () => canvas.width;
    const H = () => canvas.height;
    const p = (n: number) => ({ x: nodes[n].x * W(), y: nodes[n].y * H() });

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());
      edges.forEach(([a, b]) => {
        const pa = p(a);
        const pb = p(b);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.strokeStyle = "rgba(34,211,238,0.06)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
      pkts.forEach((pk) => {
        const prog = (t * pk.spd + pk.t) % 1;
        const [a, b] = edges[pk.e];
        const pa = p(a);
        const pb = p(b);
        const px = pa.x + (pb.x - pa.x) * prog;
        const py = pa.y + (pb.y - pa.y) * prog;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = pk.col + "55";
        ctx.fill();
      });
      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.55,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};

export default AmbientNetwork;
