import type { ComponentType } from 'react';
import type { WidgetProps } from './types';

import { loadData as heroLoad, type HeroData } from './klimamaal-hero/load';
import { Component as HeroComponent } from './klimamaal-hero/Component';
import { loadData as co2eLoad, type Co2eUdviklingData } from './co2e-udvikling/load';
import { Component as Co2eComponent } from './co2e-udvikling/Component';
import { loadData as noegletalLoad, type NoegletalData } from './noegletal/load';
import { Component as NoegletalComponent } from './noegletal/Component';
import { Component as TekstblokComponent } from './tekstblok/Component';

export type WidgetCtx = {
  kommuneNavn: string;
  nuAar: number;
  befolkningstal: number | null;
};

type ServerWidget = {
  loadData: (kommuneId: string, config: Record<string, unknown>, ctx: WidgetCtx) => Promise<unknown>;
  Component: ComponentType<WidgetProps<never>>;
};

export const SERVER_REGISTRY: Record<string, ServerWidget> = {
  'klimamaal-hero': {
    loadData: (id, cfg, ctx) => heroLoad(id, cfg, ctx.kommuneNavn, ctx.nuAar),
    Component: HeroComponent as ComponentType<WidgetProps<never>>,
  },
  'co2e-udvikling': {
    loadData: (id, cfg, ctx) => co2eLoad(id, cfg, { befolkningstal: ctx.befolkningstal }),
    Component: Co2eComponent as ComponentType<WidgetProps<never>>,
  },
  noegletal: {
    loadData: (id, cfg) => noegletalLoad(id, cfg),
    Component: NoegletalComponent as ComponentType<WidgetProps<never>>,
  },
  tekstblok: {
    loadData: async () => null,
    Component: TekstblokComponent as ComponentType<WidgetProps<never>>,
  },
};

// Eksplicit type-eksport så TData-typerne ikke pruner væk (bruges af tests/fremtidige loaders)
export type { HeroData, Co2eUdviklingData, NoegletalData };
