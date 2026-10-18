"use client";

import { useState, useTransition } from "react";
import { deleteApp, reportApp } from "@/lib/actions";

const REASONS = [
  "Spam",
  "Abuso o acoso",
  "No es una app personal",
  "Otro",
];

export function PostMenu({
  appId,
  isOwner,
  canReport,
}: {
  appId: string;
  isOwner: boolean;
  canReport: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [extra, setExtra] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submitReport() {
    const text = reason === "Otro" ? extra : reason;
    start(async () => {
      const result = await reportApp(appId, text);
      if (result?.error) setMessage(result.error);
      else {
        setMessage("Gracias. Revisaremos el reporte.");
        setReportOpen(false);
        setOpen(false);
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-full px-2 py-1 text-neutral-500 hover:bg-sky-50 hover:text-sky-600"
        aria-label="Más opciones"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
          {canReport && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
              onClick={() => {
                setReportOpen(true);
                setOpen(false);
              }}
            >
              Reportar
            </button>
          )}
          {isOwner && (
            <>
              <a
                href={`/p/${appId}/editar`}
                className="block px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Editar
              </a>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  if (confirm("¿Borrar esta publicación?")) {
                    start(async () => {
                      await deleteApp(appId);
                    });
                  }
                }}
              >
                Borrar
              </button>
            </>
          )}
          {!canReport && !isOwner && (
            <p className="px-3 py-2 text-sm text-neutral-500">
              Inicia sesión para reportar.
            </p>
          )}
        </div>
      )}

      {reportOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setReportOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">Reportar publicación</h2>
            <select
              className="mt-3 w-full rounded-lg border border-neutral-200 p-2 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {reason === "Otro" && (
              <textarea
                className="mt-2 w-full rounded-lg border border-neutral-200 p-2 text-sm"
                rows={3}
                maxLength={280}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Cuéntanos el motivo"
              />
            )}
            {message && <p className="mt-2 text-sm text-neutral-600">{message}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-sm hover:bg-neutral-100"
                onClick={() => setReportOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submitReport}
                className="rounded-full bg-neutral-900 px-3 py-1.5 text-sm font-bold text-white"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
