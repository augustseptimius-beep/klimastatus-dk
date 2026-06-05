import { byggSkabelonCsv } from '@/lib/import/handlingskatalog-skabelon';

export function GET() {
  const csv = '﻿' + byggSkabelonCsv();
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="handlingskatalog-skabelon.csv"',
    },
  });
}
