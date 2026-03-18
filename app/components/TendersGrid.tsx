"use client"

import { useState, useEffect } from "react"
import { supabase } from "../../lib/supabase"
import OpportunityCard from "./OpportunityCard"
export type { Tender } from "./OpportunityCard"

import type { Tender } from "./OpportunityCard"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFrance(t: Tender) {
  const country  = (t.country  || "").toLowerCase()
  const location = (t.location || "").toLowerCase()
  return (
    country.includes("france") ||
    country === "fr" ||
    location.includes("france") ||
    t.source === "BOAMP"
  )
}

// ─── TendersGrid ──────────────────────────────────────────────────────────────

type Tab = "france" | "europe"

export default function TendersGrid({ tenders }: { tenders: Tender[] }) {
  const [tab,         setTab]         = useState<Tab>("france")
  const [isLoggedIn,  setIsLoggedIn]  = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  const france  = tenders.filter(isFrance)
  const europe  = tenders.filter(t => !isFrance(t))
  const visible = tab === "france" ? france : europe

  // Tant que la session n'est pas déterminée, on considère connecté (pas de flash de blur)
  const loggedIn = isLoggedIn !== false

  return (
    <div>
      {/* Tabs */}
      <div style={{
        background: "hsl(220,8%,97%)",
        borderRadius: 16,
        padding: "6px",
        display: "flex",
        justifyContent: "center",
        gap: 4,
        marginBottom: 28,
      }}>
        {(["france", "europe"] as Tab[]).map(t => {
          const active = tab === t
          const count  = t === "france" ? france.length : europe.length
          const label  = t === "france" ? "France" : "Europe"
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                width: 160,
                fontSize: "0.82rem",
                fontWeight: active ? 500 : 400,
                padding: "9px 16px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all .2s ease",
                background: active ? "white" : "transparent",
                color:      active ? "hsl(220,20%,12%)" : "hsl(220,8%,52%)",
                border:     active ? "1px solid hsl(220,8%,88%)" : "1px solid transparent",
                boxShadow:  active ? "0 1px 4px hsl(220,20%,12%,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>{label}</span>
              {count > 0 && (
                <span style={{
                  fontSize: "0.68rem",
                  color: active ? "hsl(220,8%,52%)" : "hsl(220,8%,68%)",
                  fontWeight: 400,
                }}>({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {visible.map((t, i) => (
              <div
                key={t.id ?? i}
                style={{ position: "relative" }}
              >
                <OpportunityCard tender={t} showFlag={tab === "europe"} />
                {!loggedIn && i >= 2 && (
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 20,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    background: "rgba(255, 255, 255, 0.45)",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    pointerEvents: "none",
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* CTA si non connecté */}
          {!loggedIn && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 12, marginTop: 32, paddingTop: 8,
            }}>
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "hsl(220,20%,12%)", margin: 0 }}>
                Créez un compte pour voir toutes les opportunités
              </p>
              <p style={{ fontSize: "0.88rem", color: "hsl(220,8%,52%)", maxWidth: "36ch", textAlign: "center", margin: 0 }}>
                Scorées et personnalisées par Leman selon votre profil agence.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <a href="/login" style={{
                  padding: "10px 24px", borderRadius: 999, background: "hsl(220,20%,12%)",
                  color: "white", textDecoration: "none", fontSize: "0.88rem", fontWeight: 500,
                }}>
                  Créer un compte gratuit →
                </a>
                <a href="/login" style={{
                  padding: "10px 24px", borderRadius: 999, border: "1px solid hsl(220,8%,88%)",
                  color: "hsl(220,8%,52%)", textDecoration: "none", fontSize: "0.88rem",
                }}>
                  Se connecter
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: "hsl(220,8%,52%)", fontSize: "0.88rem" }}>
          Aucune opportunité {tab === "france" ? "française" : "européenne"} pour le moment.
        </div>
      )}
    </div>
  )
}
