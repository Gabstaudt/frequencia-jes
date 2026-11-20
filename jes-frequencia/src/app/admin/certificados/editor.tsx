"use client";

import { useRef, useState, useTransition } from "react";
import { Mensagem } from "@/components/admin-ui";
import { CAMPOS, preencher, tamanhoPagina, type DadosCertificado } from "@/lib/campos";
import type { BlocoQr, BlocoTexto } from "@/lib/types";
import { salvarModelo } from "./actions";

const FONTES: Record<BlocoTexto["fonte"], string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: "'Times New Roman', Times, serif",
  courier: "'Courier New', Courier, monospace",
};
const ALINHA: Record<BlocoTexto["alinhamento"], "left" | "center" | "right"> = { esquerda: "left", centro: "center", direita: "right" };

type Props = {
  tipo: string;
  imagemUrl: string | null;
  imgW: number | null;
  imgH: number | null;
  blocosIniciais: BlocoTexto[];
  qrInicial: BlocoQr;
  amostra: DadosCertificado;
};

export function EditorModelo({ tipo, imagemUrl, imgW, imgH, blocosIniciais, qrInicial, amostra }: Props) {
  const [blocos, setBlocos] = useState<BlocoTexto[]>(blocosIniciais);
  const [qr, setQr] = useState<BlocoQr>(qrInicial);
  const [sel, setSel] = useState<string | null>(blocosIniciais[1]?.id ?? blocosIniciais[0]?.id ?? null);
  const [verCampos, setVerCampos] = useState(false);
  const [msg, setMsg] = useState<{ erro?: string; ok?: string }>({});
  const [alterado, setAlterado] = useState(false);
  const [salvando, startSalvar] = useTransition();
  const areaRef = useRef<HTMLDivElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const arraste = useRef<{ id: string; px: number; py: number; x: number; y: number } | null>(null);

  const { w: pageW, h: pageH } = tamanhoPagina(imgW, imgH);
  const bloco = blocos.find((b) => b.id === sel);

  function mudar(id: string, parcial: Partial<BlocoTexto>) {
    setBlocos((bs) => bs.map((b) => (b.id === id ? { ...b, ...parcial } : b)));
    setAlterado(true);
    setMsg({});
  }
  function mudarQr(parcial: Partial<BlocoQr>) {
    setQr((q) => ({ ...q, ...parcial }));
    setAlterado(true);
    setMsg({});
  }

  function iniciar(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSel(id);
    const base = id === "qr" ? qr : blocos.find((b) => b.id === id)!;
    arraste.current = { id, px: e.clientX, py: e.clientY, x: base.x, y: base.y };
  }
  function mover(e: React.PointerEvent) {
    const a = arraste.current;
    const area = areaRef.current;
    if (!a || !area) return;
    const r = area.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, a.x + ((e.clientX - a.px) / r.width) * 100)) * 10) / 10;
    const y = Math.round(Math.max(0, Math.min(100, a.y + ((e.clientY - a.py) / r.height) * 100)) * 10) / 10;
    if (a.id === "qr") mudarQr({ x, y });
    else mudar(a.id, { x, y });
  }
  function soltar() {
    arraste.current = null;
  }

  function inserirCampo(campo: string) {
    if (!bloco) return;
    const el = textoRef.current;
    const tag = `{{${campo}}}`;
    if (el) {
      const ini = el.selectionStart ?? bloco.texto.length;
      const fim = el.selectionEnd ?? ini;
      mudar(bloco.id, { texto: bloco.texto.slice(0, ini) + tag + bloco.texto.slice(fim) });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(ini + tag.length, ini + tag.length);
      });
    } else mudar(bloco.id, { texto: bloco.texto + tag });
  }

  function novoBloco() {
    const id = `t${Date.now().toString(36)}`;
    setBlocos((bs) => [...bs, { id, texto: "Novo texto com {{nome}}", x: 20, y: 50, largura: 60, tamanho: 14, alinhamento: "centro", fonte: "helvetica", negrito: false, cor: "#151922" }]);
    setSel(id);
    setAlterado(true);
  }

  function salvar() {
    startSalvar(async () => {
      const r = await salvarModelo(tipo, blocos, qr);
      setMsg(r);
      if (r.ok) setAlterado(false);
    });
  }

  const fs = (pt: number) => `calc(${pt} / ${pageW} * 100cqw)`;
  const qrAltPct = (qr.tamanho * pageW) / pageH;

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* ÁREA DO CERTIFICADO */}
      <section className="card flex min-w-0 flex-[999_1_420px] flex-col gap-3 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-[17px] font-semibold">Prévia · arraste os textos e o QR code</h2>
          <div className="flex overflow-hidden rounded-[10px] border border-field text-sm">
            <button type="button" onClick={() => setVerCampos(false)} className={`h-10 px-3 font-semibold ${!verCampos ? "bg-ink text-white" : "bg-white text-body"}`}>
              Preenchido
            </button>
            <button type="button" onClick={() => setVerCampos(true)} className={`h-10 px-3 font-semibold ${verCampos ? "bg-ink text-white" : "bg-white text-body"}`}>
              Com os campos
            </button>
          </div>
        </div>
        <div style={{ containerType: "inline-size" }} className="w-full">
          <div
            ref={areaRef}
            onPointerMove={mover}
            onPointerUp={soltar}
            onPointerCancel={soltar}
            className="relative w-full select-none overflow-hidden rounded-md border border-line bg-white shadow-[0_6px_24px_rgba(21,25,34,0.08)]"
            style={{ aspectRatio: `${pageW} / ${pageH}` }}
          >
            {imagemUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagemUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />
            ) : (
              <div className="pointer-events-none absolute inset-[2.2%] rounded border-[0.35cqw] border-primary" />
            )}
            {blocos.map((b) => (
              <div
                key={b.id}
                onPointerDown={(e) => iniciar(e, b.id)}
                className={`absolute cursor-move touch-none whitespace-pre-wrap break-words ${sel === b.id ? "outline-2 outline-primary outline-dashed" : "hover:outline hover:outline-1 hover:outline-primary/50"}`}
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${b.largura}%`,
                  fontSize: fs(b.tamanho),
                  lineHeight: 1.3,
                  textAlign: ALINHA[b.alinhamento],
                  fontFamily: FONTES[b.fonte],
                  fontWeight: b.negrito ? 700 : 400,
                  color: b.cor,
                }}
              >
                {verCampos ? <TextoComCampos texto={b.texto} /> : preencher(b.texto, amostra)}
              </div>
            ))}
            {qr.ativo && (
              <div
                onPointerDown={(e) => iniciar(e, "qr")}
                role="img"
                aria-label="Posição do QR code"
                className={`absolute flex cursor-move touch-none items-center justify-center bg-white text-[1.4cqw] font-bold text-ink ${sel === "qr" ? "outline-2 outline-primary outline-dashed" : ""}`}
                style={{ left: `${qr.x}%`, top: `${qr.y}%`, width: `${qr.tamanho}%`, height: `${qrAltPct}%` }}
              >
                <QrFalso />
              </div>
            )}
          </div>
        </div>
        <p className="text-[13px] text-muted">
          Exemplo com: {amostra.nome} · {amostra.horas}h · código {amostra.codigo}. O PDF final usa as mesmas posições.
        </p>
      </section>

      {/* PAINEL */}
      <aside className="card flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          {blocos.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSel(b.id)}
              className={`h-9 max-w-[160px] truncate rounded-lg px-3 text-sm font-semibold ${sel === b.id ? "bg-primary text-white" : "border border-field bg-white text-body"}`}
            >
              {b.texto.replace(/\{\{|\}\}/g, "").slice(0, 18) || `Texto ${i + 1}`}
            </button>
          ))}
          <button type="button" onClick={() => setSel("qr")} className={`h-9 rounded-lg px-3 text-sm font-semibold ${sel === "qr" ? "bg-primary text-white" : "border border-field bg-white text-body"}`}>
            QR code
          </button>
          <button type="button" onClick={novoBloco} className="h-9 rounded-lg border border-dashed border-[#9aa3b5] px-3 text-sm font-semibold text-body">
            + Texto
          </button>
        </div>

        {bloco && (
          <div className="flex flex-col gap-3.5">
            <label className="label">
              Texto
              <textarea
                ref={textoRef}
                value={bloco.texto}
                onChange={(e) => mudar(bloco.id, { texto: e.target.value })}
                rows={4}
                className="w-full rounded-[10px] border border-field bg-white p-3 text-[15px] outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Inserir campo</span>
              <div className="flex flex-wrap gap-1.5">
                {CAMPOS.map((c) => (
                  <button key={c} type="button" onClick={() => inserirCampo(c)} className="rounded-md bg-primary-soft px-2 py-1.5 font-mono text-xs font-semibold text-primary-ink">
                    {`{{${c}}}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Numero label="Tamanho (pt)" valor={bloco.tamanho} min={4} max={120} onChange={(v) => mudar(bloco.id, { tamanho: v })} />
              <Numero label="Largura (%)" valor={bloco.largura} min={5} max={100} onChange={(v) => mudar(bloco.id, { largura: v })} />
              <Numero label="Horizontal (%)" valor={bloco.x} min={0} max={100} passo={0.5} onChange={(v) => mudar(bloco.id, { x: v })} />
              <Numero label="Vertical (%)" valor={bloco.y} min={0} max={100} passo={0.5} onChange={(v) => mudar(bloco.id, { y: v })} />
              <label className="label">
                Alinhamento
                <select className="input h-11" value={bloco.alinhamento} onChange={(e) => mudar(bloco.id, { alinhamento: e.target.value as BlocoTexto["alinhamento"] })}>
                  <option value="esquerda">Esquerda</option>
                  <option value="centro">Centro</option>
                  <option value="direita">Direita</option>
                </select>
              </label>
              <label className="label">
                Fonte
                <select className="input h-11" value={bloco.fonte} onChange={(e) => mudar(bloco.id, { fonte: e.target.value as BlocoTexto["fonte"] })}>
                  <option value="helvetica">Sem serifa</option>
                  <option value="times">Com serifa</option>
                  <option value="courier">Monoespaçada</option>
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={bloco.negrito} onChange={(e) => mudar(bloco.id, { negrito: e.target.checked })} className="h-5 w-5 accent-primary" />
                Negrito
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                <input type="color" value={bloco.cor} onChange={(e) => mudar(bloco.id, { cor: e.target.value })} className="h-9 w-12 rounded border border-field" />
                Cor
              </label>
            </div>
            <button
              type="button"
              className="btn-danger min-h-10 text-sm"
              onClick={() => {
                setBlocos((bs) => bs.filter((b) => b.id !== bloco.id));
                setSel(null);
                setAlterado(true);
              }}
            >
              Remover este texto
            </button>
          </div>
        )}

        {sel === "qr" && (
          <div className="flex flex-col gap-3.5">
            <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={qr.ativo} onChange={(e) => mudarQr({ ativo: e.target.checked })} className="h-5 w-5 accent-primary" />
              Mostrar QR code de validação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Numero label="Tamanho (%)" valor={qr.tamanho} min={4} max={40} onChange={(v) => mudarQr({ tamanho: v })} />
              <span />
              <Numero label="Horizontal (%)" valor={qr.x} min={0} max={100} passo={0.5} onChange={(v) => mudarQr({ x: v })} />
              <Numero label="Vertical (%)" valor={qr.y} min={0} max={100} passo={0.5} onChange={(v) => mudarQr({ y: v })} />
            </div>
            <p className="text-[13px] text-muted">O QR code abre a página de validação daquele certificado.</p>
          </div>
        )}

        {!bloco && sel !== "qr" && <p className="text-sm text-muted">Toque num texto ou no QR code para editar.</p>}

        <div className="flex flex-col gap-2.5 border-t border-line pt-4">
          <Mensagem erro={msg.erro} ok={msg.ok} />
          <button type="button" onClick={salvar} disabled={salvando} className="btn-primary">
            {salvando ? "Salvando…" : alterado ? "Salvar modelo" : "Modelo salvo"}
          </button>
          <a href={`/api/admin/certificados/preview?tipo=${encodeURIComponent(tipo)}`} target="_blank" rel="noreferrer" className="btn-secondary">
            Ver PDF de teste
          </a>
          {alterado && <span className="text-xs text-warn">Salve antes de ver o PDF de teste.</span>}
        </div>
      </aside>
    </div>
  );
}

function TextoComCampos({ texto }: { texto: string }) {
  const partes = texto.split(/(\{\{\s*\w+\s*\}\})/g);
  return (
    <>
      {partes.map((p, i) =>
        /^\{\{/.test(p) ? (
          <span key={i} className="rounded bg-primary-soft px-[0.2em] font-mono text-[0.85em] text-primary-ink">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Numero({ label, valor, onChange, min, max, passo = 1 }: { label: string; valor: number; onChange: (v: number) => void; min: number; max: number; passo?: number }) {
  return (
    <label className="label">
      {label}
      <input
        type="number"
        className="input h-11"
        value={valor}
        min={min}
        max={max}
        step={passo}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
      />
    </label>
  );
}

function QrFalso() {
  return (
    <svg viewBox="0 0 21 21" className="h-full w-full" aria-hidden="true">
      <path
        fill="#151922"
        d="M0 0h7v7H0zM1 1v5h5V1zM2 2h3v3H2zM14 0h7v7h-7zM15 1v5h5V1zM16 2h3v3h-3zM0 14h7v7H0zM1 15v5h5v-5zM2 16h3v3H2zM8 0h1v2H8zM10 1h2v1h-2zM9 3h2v2H9zM12 4h1v3h-1zM8 6h2v2H8zM0 8h2v1H0zM3 8h3v1H3zM7 9h2v2H7zM10 8h3v1h-3zM14 8h2v2h-2zM17 8h4v1h-4zM1 10h3v2H1zM5 11h1v2H5zM11 10h2v3h-2zM15 11h3v1h-3zM19 10h2v3h-2zM8 12h2v1H8zM14 13h2v2h-2zM8 14h3v1H8zM12 14h1v2h-1zM17 14h2v1h-2zM9 16h2v2H9zM14 16h1v3h-1zM16 16h3v2h-3zM20 16h1v5h-1zM8 19h4v2H8zM12 18h2v1h-2zM16 19h3v2h-3z"
      />
    </svg>
  );
}
