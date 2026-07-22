---
id: lineage
title: Linaje de datos
sidebar_label: Linaje
sidebar_position: 2
---

# Linaje de consumo de datos

Diagrama de qué tablas alimentan cada feature del modelo (Mermaid — Docusaurus lo renderiza nativo).

```mermaid
graph LR
  T1[("catalog.esquema.tabla_ejemplo")] --> F1[feature_a]
  T1 --> F2[feature_b]
  F1 & F2 --> M{{modelo_ejemplo}}
```

## Tablas fuente

| Tabla | Columnas consumidas |
| --- | --- |
| `catalog.esquema.tabla_ejemplo` | feature_a, feature_b |
