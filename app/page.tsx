export default function Home() {
  return (
    <>
      <style>{`
        .ks {
          --ink:     #1A1A18;
          --ink-2:   #3D3D38;
          --ink-3:   #6B6B63;
          --ink-4:   #9A9A8E;
          --sand:    #F5F0E8;
          --sand-2:  #EDE6DA;
          --sand-3:  #E0D8C7;
          --line:    #D9D2C2;
          --line-2:  #C8C0AE;
          --moss:    #E8EFE6;
          --moss-2:  #D8E3D5;
          --green:   #1E6B3A;
          --green-d: #154C29;
          --green-l: #2A8048;
          --amber:   #7A4E2A;
          --rust:    #8B2E2E;
          --white:   #FFFFFF;
          --font:    var(--font-rubik, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif);
          --mono:    ui-monospace, "SF Mono", Menlo, Consolas, monospace;
          --max:     1120px;
          --ease:    cubic-bezier(0.2, 0, 0, 1);

          font-family: var(--font);
          font-size: 16px;
          color: var(--ink);
          background: var(--sand);
          font-weight: 500;
          line-height: 1.55;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          min-height: 100vh;
        }
        .ks *, .ks *::before, .ks *::after { box-sizing: border-box; }
        .ks h1, .ks h2, .ks h3, .ks h4 { font-weight: 700; margin: 0; letter-spacing: -0.02em; text-wrap: balance; }
        .ks p { margin: 0; text-wrap: pretty; }
        .ks a { color: inherit; }

        .ks .wrap { max-width: var(--max); margin: 0 auto; padding: 0 32px; }
        .ks .narrow { max-width: 760px; }

        /* Logo */
        .ks .logo {
          display: inline-flex; align-items: baseline; text-decoration: none; gap: 0;
          font-weight: 700; font-size: 19px; letter-spacing: -0.02em; color: var(--ink);
        }
        .ks .logo .period {
          font-family: var(--font-poppins, Georgia, serif);
          color: var(--green);
          font-size: 1.15em;
          font-weight: 700;
          line-height: 0;
          margin: 0 0.04em;
        }

        /* Buttons */
        .ks .btn {
          display: inline-flex; align-items: center; gap: 8px;
          font: 500 14px/1 var(--font);
          padding: 12px 18px; border-radius: 4px; border: 1px solid transparent;
          cursor: pointer; text-decoration: none; white-space: nowrap;
          transition: background 120ms var(--ease), color 120ms var(--ease), border-color 120ms var(--ease);
        }
        .ks .btn.primary   { background: var(--green); color: var(--white); border-color: var(--green); }
        .ks .btn.primary:hover { background: var(--green-d); border-color: var(--green-d); }
        .ks .btn.secondary { background: transparent; color: var(--ink); border-color: var(--line-2); }
        .ks .btn.secondary:hover { background: var(--sand-2); border-color: var(--ink-4); }
        .ks .btn.ghost     { background: transparent; color: var(--ink); padding-left: 4px; padding-right: 4px; }
        .ks .btn.ghost:hover { color: var(--green); }
        .ks .btn.lg { padding: 14px 22px; font-size: 15px; }
        .ks .btn .arrow { transition: transform 120ms var(--ease); }
        .ks .btn:hover .arrow { transform: translateX(2px); }

        /* Nav */
        .ks .nav {
          display: flex; justify-content: space-between; align-items: center;
          padding: 24px 32px; max-width: var(--max); margin: 0 auto;
        }
        .ks .nav-links { display: flex; gap: 28px; }
        .ks .nav-links a { font-size: 14px; text-decoration: none; color: var(--ink-2); }
        .ks .nav-links a:hover { color: var(--ink); }
        @media (max-width: 720px) { .ks .nav-links { display: none; } }

        /* Hero */
        .ks .hero { padding: 72px 0 56px; }
        .ks .hero h1 {
          font-size: clamp(40px, 5.4vw, 72px);
          line-height: 1.04;
          max-width: 940px;
          margin-bottom: 28px;
        }
        .ks .hero .sub {
          font-size: 19px; line-height: 1.55; color: var(--ink-2);
          max-width: 660px; margin-bottom: 36px; font-weight: 500;
        }
        .ks .hero .ctas { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

        /* Product preview */
        .ks .preview-wrap { margin-top: 72px; }
        .ks .preview-frame {
          background: var(--white); border: 1px solid var(--line); border-radius: 12px; overflow: hidden;
        }
        .ks .preview-chrome {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--sand-2);
        }
        .ks .preview-chrome .dots { display: flex; gap: 6px; }
        .ks .preview-chrome .dots span { width: 10px; height: 10px; border-radius: 50%; background: var(--line-2); }
        .ks .preview-chrome .url {
          font-family: var(--mono); font-size: 12px; color: var(--ink-3);
          background: var(--white); border: 1px solid var(--line);
          padding: 4px 12px; border-radius: 4px; flex: 1; max-width: 420px; margin: 0 auto;
        }
        .ks .preview-chrome .url b { color: var(--ink); font-weight: 500; }
        .ks .preview-body { display: grid; grid-template-columns: 200px 1fr; min-height: 380px; }
        @media (max-width: 700px) { .ks .preview-body { grid-template-columns: 1fr; } .ks .preview-side { display: none; } }
        .ks .preview-side {
          border-right: 1px solid var(--line); padding: 20px 12px; background: var(--sand);
          display: flex; flex-direction: column; gap: 18px;
        }
        .ks .preview-side .section-label {
          font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--green); font-weight: 600; padding: 0 8px;
        }
        .ks .preview-side .nav-item {
          font-size: 13px; color: var(--ink-2); padding: 6px 8px;
          display: flex; justify-content: space-between; align-items: center; font-weight: 500;
        }
        .ks .preview-side .nav-item.active {
          background: var(--white); border: 1px solid var(--line); border-radius: 4px;
          color: var(--ink); font-weight: 600; padding: 5px 7px;
        }
        .ks .preview-side .nav-item .count { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
        .ks .preview-side .ns { display: flex; flex-direction: column; gap: 2px; }
        .ks .preview-main { padding: 28px 32px; min-width: 0; }
        .ks .preview-eyebrow {
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--green); font-weight: 600; margin-bottom: 8px;
        }
        .ks .preview-main h3 { font-size: 24px; line-height: 1.1; letter-spacing: -0.02em; margin-bottom: 20px; }
        .ks .preview-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
          border-top: 1px solid var(--ink); margin-bottom: 24px;
        }
        .ks .preview-stat {
          padding: 14px 16px 14px 0;
          border-right: 1px solid var(--line); border-bottom: 1px solid var(--line);
        }
        .ks .preview-stat:not(:first-child) { padding-left: 20px; }
        .ks .preview-stat:last-child { border-right: none; padding-right: 0; }
        .ks .preview-stat .l { font-size: 11px; color: var(--ink-3); margin-bottom: 6px; line-height: 1.3; }
        .ks .preview-stat .n { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .ks .preview-stat .n em { font-style: normal; color: var(--green); }
        .ks .preview-table { font-size: 12px; width: 100%; border-collapse: collapse; }
        .ks .preview-table th {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--green); font-weight: 600; text-align: left; padding: 8px 0; border-bottom: 1px solid var(--line);
        }
        .ks .preview-table td { padding: 10px 0; border-bottom: 1px solid var(--sand-2); color: var(--ink-2); font-weight: 500; }
        .ks .preview-table td:nth-child(3) { text-align: right; font-family: var(--mono); font-size: 11px; }
        .ks .preview-table .pill { display: inline-flex; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .ks .preview-table .pill.ok   { background: #DDE9DE; color: #2D5A3D; }
        .ks .preview-table .pill.warn { background: #F5EEDD; color: var(--amber); }
        .ks .preview-table .pill.err  { background: #F2E0DC; color: var(--rust); }

        /* Audience strip */
        .ks .audience-strip { padding: 36px 0 24px; }
        .ks .audience-strip .row {
          display: flex; gap: 18px; align-items: center; flex-wrap: wrap;
          padding-top: 28px; border-top: 1px solid var(--line);
        }
        .ks .audience-strip .label {
          font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--green); font-weight: 600;
        }
        .ks .audience-strip .for {
          font-size: 17px; color: var(--ink-2); font-weight: 500; line-height: 1.5; flex: 1; min-width: 280px;
        }
        .ks .audience-strip .for b { color: var(--ink); font-weight: 600; }
        .ks .audience-strip .frameworks { display: flex; gap: 8px; flex-wrap: wrap; }
        .ks .audience-strip .fw {
          font-family: var(--mono); font-size: 12px; padding: 5px 10px;
          background: var(--white); border: 1px solid var(--line); border-radius: 4px; color: var(--ink-2);
        }

        /* Section primitives */
        .ks section.block { padding: 96px 0; border-top: 1px solid var(--line); }
        .ks .eyebrow {
          font-size: 13px; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--green); margin-bottom: 18px;
        }
        .ks h2.section-h {
          font-size: clamp(32px, 3.6vw, 44px); line-height: 1.1; margin-bottom: 20px; max-width: 880px;
        }
        .ks .lede { font-size: 19px; line-height: 1.6; color: var(--ink-2); max-width: 720px; font-weight: 500; }

        /* Problem */
        .ks .problem-list {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0;
          margin-top: 56px; border-top: 1px solid var(--ink);
        }
        @media (max-width: 720px) { .ks .problem-list { grid-template-columns: 1fr; } }
        .ks .problem-item {
          display: grid; grid-template-columns: 40px 1fr; gap: 18px;
          padding: 28px 28px 28px 0; border-bottom: 1px solid var(--line); align-items: start;
        }
        .ks .problem-item:nth-child(odd) { padding-right: 36px; border-right: 1px solid var(--line); }
        .ks .problem-item:nth-child(even) { padding-left: 36px; }
        @media (max-width: 720px) {
          .ks .problem-item:nth-child(odd) { padding-right: 0; border-right: none; }
          .ks .problem-item:nth-child(even) { padding-left: 0; }
        }
        .ks .problem-item .glyph {
          width: 36px; height: 36px; border: 1px solid var(--line); background: var(--white);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          color: var(--ink-3); flex: none;
        }
        .ks .problem-item .glyph svg { width: 18px; height: 18px; stroke-width: 1.75; }
        .ks .problem-item h4 { font-size: 17px; font-weight: 600; margin-bottom: 6px; line-height: 1.3; }
        .ks .problem-item p { font-size: 15px; color: var(--ink-2); line-height: 1.55; font-weight: 500; }

        /* Steps */
        .ks .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 56px; }
        @media (max-width: 900px) { .ks .steps { grid-template-columns: 1fr; gap: 32px; } }
        .ks .step .num {
          font-size: 13px; font-weight: 700; color: var(--green); letter-spacing: 0.06em;
          padding-bottom: 14px; margin-bottom: 18px; border-bottom: 1px solid var(--green);
          display: inline-block; padding-right: 24px;
        }
        .ks .step h3 { font-size: 22px; line-height: 1.25; margin-bottom: 12px; }
        .ks .step p { font-size: 16px; line-height: 1.6; color: var(--ink-2); font-weight: 500; }

        /* Outcomes */
        .ks .outcomes {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 0;
          margin-top: 48px; border-top: 1px solid var(--ink);
        }
        @media (max-width: 900px) { .ks .outcomes { grid-template-columns: 1fr; } }
        .ks .outcome { padding: 32px 28px 32px 0; border-bottom: 1px solid var(--line); }
        .ks .outcome:not(:first-child) { padding-left: 28px; }
        .ks .outcome:not(:last-child) { border-right: 1px solid var(--line); padding-right: 28px; }
        @media (max-width: 900px) {
          .ks .outcome:not(:first-child) { padding-left: 0; }
          .ks .outcome:not(:last-child) { border-right: none; padding-right: 0; }
        }
        .ks .outcome .label { font-size: 14px; color: var(--ink-3); font-weight: 500; margin-bottom: 14px; line-height: 1.4; }
        .ks .outcome .num {
          font-size: 38px; font-weight: 700; line-height: 1.1;
          letter-spacing: -0.025em; font-variant-numeric: tabular-nums;
        }
        .ks .outcome .num em { font-style: normal; color: var(--green); }
        .ks .disclosure {
          margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--line);
          font-size: 13px; color: var(--ink-3); line-height: 1.5; max-width: 640px;
        }

        /* Artifacts */
        .ks .artifacts { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 56px; }
        @media (max-width: 800px) { .ks .artifacts { grid-template-columns: 1fr; } }
        .ks .artifact { background: var(--white); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
        .ks .artifact .head {
          padding: 14px 18px; border-bottom: 1px solid var(--line); background: var(--sand-2);
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--ink-3); font-weight: 600; display: flex; justify-content: space-between; align-items: center;
        }
        .ks .artifact .head .what { color: var(--green); }
        .ks .artifact .body { padding: 24px 28px; font-size: 14px; line-height: 1.55; color: var(--ink-2); min-height: 220px; }
        .ks .email-from { font-size: 12px; color: var(--ink-3); margin-bottom: 4px; font-family: var(--mono); }
        .ks .email-subject { font-size: 16px; font-weight: 600; color: var(--ink); margin-bottom: 18px; }
        .ks .email-body p { margin-bottom: 12px; }
        .ks .email-body a { color: var(--green); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
        .ks .toc { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
        .ks .toc li {
          display: grid; grid-template-columns: 36px 1fr 60px;
          padding: 10px 0; border-bottom: 1px solid var(--sand-2); align-items: center; font-size: 14px;
        }
        .ks .toc li:last-child { border-bottom: none; }
        .ks .toc li .n { font-family: var(--mono); font-size: 11px; color: var(--ink-3); }
        .ks .toc li .t { color: var(--ink); font-weight: 500; }
        .ks .toc li .src { font-family: var(--mono); font-size: 11px; color: var(--green); text-align: right; }

        /* Pricing */
        .ks .pricing { padding: 96px 0; border-top: 1px solid var(--line); }
        .ks .price-row { display: grid; grid-template-columns: 640px 1fr; gap: 56px; margin-top: 40px; align-items: start; }
        @media (max-width: 960px) { .ks .price-row { grid-template-columns: 1fr; gap: 32px; } }
        .ks .price-card {
          background: var(--white); border: 1px solid var(--line); border-radius: 8px;
          padding: 48px; display: grid; gap: 24px;
        }
        .ks .price-card .head { display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; }
        .ks .price-card .price { font-size: 48px; font-weight: 700; letter-spacing: -0.025em; line-height: 1; font-variant-numeric: tabular-nums; }
        .ks .price-card .per { font-size: 19px; color: var(--ink-3); font-weight: 500; }
        .ks .price-card .terms { font-size: 15px; color: var(--ink-2); font-weight: 500; line-height: 1.65; }
        .ks .price-card .terms b { font-weight: 700; color: var(--ink); }
        .ks .price-card ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; font-size: 15px; color: var(--ink-2); }
        .ks .price-card ul li { display: grid; grid-template-columns: 20px 1fr; gap: 10px; align-items: start; }
        .ks .price-card ul li::before {
          content: ""; width: 14px; height: 14px; margin-top: 4px;
          background: var(--green);
          -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6L9 17l-5-5'/></svg>") center/contain no-repeat;
                  mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6L9 17l-5-5'/></svg>") center/contain no-repeat;
        }
        .ks .price-card .price-cta { margin-top: 8px; }
        .ks .price-compare { padding: 8px 0; }
        .ks .price-compare h4 {
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--green); font-weight: 600; margin-bottom: 20px;
        }
        .ks .price-compare .item { padding: 14px 0; border-bottom: 1px solid var(--line); }
        .ks .price-compare .item:first-child { border-top: 1px solid var(--ink); padding-top: 18px; }
        .ks .price-compare .item .what { font-size: 14px; font-weight: 600; color: var(--ink); margin-bottom: 4px; }
        .ks .price-compare .item .meta { font-size: 13px; color: var(--ink-3); line-height: 1.5; font-weight: 500; }
        .ks .price-compare .item .cost { font-family: var(--mono); font-size: 13px; color: var(--ink-2); margin-top: 6px; }

        /* FAQ */
        .ks .faq { margin-top: 40px; }
        .ks .faq details { border-bottom: 1px solid var(--line); padding: 24px 0; }
        .ks .faq details:first-child { border-top: 1px solid var(--ink); }
        .ks .faq summary {
          list-style: none; cursor: pointer;
          font-size: 19px; font-weight: 600; letter-spacing: -0.01em;
          display: flex; justify-content: space-between; align-items: center; gap: 24px;
        }
        .ks .faq summary::-webkit-details-marker { display: none; }
        .ks .faq summary .plus { flex: none; width: 18px; height: 18px; position: relative; transition: transform 200ms var(--ease); }
        .ks .faq summary .plus::before, .ks .faq summary .plus::after {
          content: ""; position: absolute; background: var(--ink-3); left: 50%; top: 50%; transform: translate(-50%, -50%);
        }
        .ks .faq summary .plus::before { width: 14px; height: 1.5px; }
        .ks .faq summary .plus::after  { width: 1.5px; height: 14px; transition: transform 200ms var(--ease); }
        .ks .faq details[open] summary .plus::after { transform: translate(-50%, -50%) rotate(90deg); }
        .ks .faq details p { margin-top: 14px; font-size: 16px; color: var(--ink-2); line-height: 1.65; max-width: 720px; font-weight: 500; }

        /* Founders */
        .ks .founders { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 720px) { .ks .founders { grid-template-columns: 1fr; } }
        .ks .founder {
          background: var(--white); border: 1px solid var(--line); border-radius: 8px;
          padding: 28px; display: grid; grid-template-columns: 56px 1fr; gap: 18px; align-items: start;
        }
        .ks .founder .avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--moss-2); color: var(--green-d);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
        }
        .ks .founder h4 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
        .ks .founder .role { font-size: 13px; color: var(--ink-3); margin-bottom: 12px; }
        .ks .founder p { font-size: 14px; color: var(--ink-2); line-height: 1.55; font-weight: 500; }

        /* Final CTA */
        .ks .final { padding: 96px 0; border-top: 1px solid var(--line); background: var(--moss); }
        .ks .final h2 { font-size: clamp(32px, 3.4vw, 44px); line-height: 1.1; max-width: 720px; margin-bottom: 24px; }
        .ks .final p { font-size: 18px; color: var(--ink-2); max-width: 600px; margin-bottom: 32px; }
        .ks .final .actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .ks .final .actions .or { font-size: 14px; color: var(--ink-3); }

        /* Footer */
        .ks footer { padding: 40px 0 48px; border-top: 1px solid var(--line); }
        .ks .footer-row { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
        .ks .footer-meta { display: flex; gap: 24px; align-items: center; font-size: 14px; color: var(--ink-3); font-weight: 500; }
        .ks .footer-meta a { color: var(--ink-2); text-decoration: none; }
        .ks .footer-meta a:hover { color: var(--ink); }
      `}</style>

      <div className="ks">
        {/* NAV */}
        <header>
          <div className="nav">
            <a className="logo" href="#" aria-label="Klimastatus.dk">
              <span>Klimastatus<span className="period">.</span>dk</span>
            </a>
            <nav className="nav-links">
              <a href="#hvordan">Hvordan</a>
              <a href="#priser">Pris</a>
              <a href="#faq">FAQ</a>
              <a href="#hvem">Hvem står bag</a>
            </nav>
            <a className="btn primary" href="#demo">Book demo</a>
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div className="wrap">
            <h1>Din Klimastatus tager to måneder. Den behøver den ikke.</h1>
            <p className="sub">
              Klimastatus.dk indsamler statusopdateringer fra dine tovholdere, trækker nøgletal fra offentlige datakilder og genererer et udkast til din Klimastatus og CCTF-selvevaluering. Du bruger ugen på at godkende — ikke på at rykke og skrive.
            </p>
            <div className="ctas">
              <a className="btn primary lg" href="#demo">Book demo <span className="arrow">→</span></a>
              <a className="btn ghost" href="#cctf">Læs CCTF-mapping (PDF) <span className="arrow">→</span></a>
            </div>

            {/* Product preview */}
            <div className="preview-wrap">
              <div className="preview-frame">
                <div className="preview-chrome">
                  <div className="dots"><span /><span /><span /></div>
                  <div className="url"><b>klimastatus.dk</b>/aarhus/2025</div>
                  <div style={{ width: 38 }} />
                </div>
                <div className="preview-body">
                  <aside className="preview-side">
                    <div className="ns">
                      <div className="section-label">Klimastatus 2025</div>
                      <div className="nav-item active"><span>Oversigt</span></div>
                      <div className="nav-item"><span>Fagområder</span><span className="count">12/18</span></div>
                      <div className="nav-item"><span>Datakilder</span><span className="count">8/10</span></div>
                      <div className="nav-item"><span>Rapport</span></div>
                    </div>
                    <div className="ns">
                      <div className="section-label">Administration</div>
                      <div className="nav-item"><span>Tovholdere</span></div>
                      <div className="nav-item"><span>Tidligere år</span></div>
                    </div>
                  </aside>
                  <div className="preview-main">
                    <div className="preview-eyebrow">Aarhus Kommune · Klimastatus 2025</div>
                    <h3>Oversigt</h3>
                    <div className="preview-stats">
                      <div className="preview-stat">
                        <div className="l">Indberetninger</div>
                        <div className="n">12 / 18</div>
                      </div>
                      <div className="preview-stat">
                        <div className="l">Datakilder synk.</div>
                        <div className="n">8 / 10</div>
                      </div>
                      <div className="preview-stat">
                        <div className="l">Dage til frist</div>
                        <div className="n"><em>14</em></div>
                      </div>
                    </div>
                    <table className="preview-table">
                      <thead>
                        <tr><th>Fagområde</th><th>Tovholder</th><th>CO₂e (t)</th></tr>
                      </thead>
                      <tbody>
                        <tr><td>Transport</td><td><span className="pill ok">Indsendt</span></td><td>14.832</td></tr>
                        <tr><td>Bygninger</td><td><span className="pill ok">Indsendt</span></td><td>9.104</td></tr>
                        <tr><td>Affald</td><td><span className="pill warn">3 dage</span></td><td>3.217</td></tr>
                        <tr><td>Landbrug</td><td><span className="pill err">Overskredet</span></td><td>—</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AUDIENCE STRIP */}
        <section className="audience-strip">
          <div className="wrap">
            <div className="row">
              <div className="label">For</div>
              <p className="for">
                <b>Klimakoordinatorer i danske kommuner</b> med pligt til at rapportere efter et eller flere af følgende rammeværker:
              </p>
              <div className="frameworks">
                <span className="fw">CCTF</span>
                <span className="fw">DK2020</span>
                <span className="fw">Klimaalliancen</span>
              </div>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="block">
          <div className="wrap">
            <div className="eyebrow">Sådan ser året ud nu</div>
            <h2 className="section-h">Excel-ark, rykkere og et dokument politikerne læser på 20 minutter.</h2>
            <p className="lede">Den årlige rapportering kører på e-mails, regneark og hukommelse. Det fungerer — men det er dyrt i tid, og det bliver ikke bedre næste år.</p>

            <div className="problem-list">
              <div className="problem-item">
                <span className="glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
                  </svg>
                </span>
                <div>
                  <h4>20 tovholdere på e-mail</h4>
                  <p>Statusskemaer rundsendt manuelt. Svar kommer halvfyldte, tre uger for sent, eller slet ikke. Rykkere skrives i hånden.</p>
                </div>
              </div>
              <div className="problem-item">
                <span className="glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
                  </svg>
                </span>
                <div>
                  <h4>Tre versioner af samme Excel-ark</h4>
                  <p>Tovholdere, koordinator, høringsgruppe — alle har deres egen kopi. Ingen ved hvilken der er den endelige.</p>
                </div>
              </div>
              <div className="problem-item">
                <span className="glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="6" rx="9" ry="3"/><path d="M3 6v12c0 1.7 4 3 9 3s9-1.3 9-3V6"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>
                  </svg>
                </span>
                <div>
                  <h4>Data fra fire kilder klippet ind manuelt</h4>
                  <p>Energistyrelsen, Danmarks Statistik, Miljøstyrelsen, Klimadatastyrelsen. Hver med eget format, egen rytme, egen kvalitet.</p>
                </div>
              </div>
              <div className="problem-item">
                <span className="glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
                  </svg>
                </span>
                <div>
                  <h4>6 ugers fuldtidsarbejde</h4>
                  <p>Det er hvad det koster en typisk klimakoordinator at få det hele i hus. Hvert år. Næste år forfra.</p>
                </div>
              </div>
              <div className="problem-item">
                <span className="glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13h6M9 17h4"/>
                  </svg>
                </span>
                <div>
                  <h4>En CCTF-selvevaluering der starter fra bunden</h4>
                  <p>Selvom 70 % af felterne stort set er de samme år for år. Ingen genbrug, ingen kobling til Klimastatus.</p>
                </div>
              </div>
              <div className="problem-item">
                <span className="glyph">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12h6l3-9 4 18 3-9h4"/>
                  </svg>
                </span>
                <div>
                  <h4>Resultatet: 20 minutter i fagudvalget</h4>
                  <p>Det dokument I har brugt to måneder på, læses på et kvarter. Det skal være lettere at producere — ikke vigtigere at lave.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="block" id="hvordan">
          <div className="wrap">
            <div className="eyebrow">Sådan virker det</div>
            <h2 className="section-h">Tre trin. Ingen nye systemer for dine kolleger.</h2>
            <div className="steps">
              <div className="step">
                <div className="num">01</div>
                <h3>Tovholderne sender status</h3>
                <p>Via et link i deres email. Ingen login, ingen nye systemer at lære. De udfylder felterne for deres område og indsender.</p>
              </div>
              <div className="step">
                <div className="num">02</div>
                <h3>Data trækkes ind automatisk</h3>
                <p>CO₂-regnskab, varmepumper, elbiler og VE-andel hentes fra de offentlige datakilder. Tovholderne udfylder kun det, der ikke kan trækkes automatisk.</p>
              </div>
              <div className="step">
                <div className="num">03</div>
                <h3>Du modtager et udkast</h3>
                <p>Klimastatus og CCTF-selvevaluering ligger klar til gennemgang og godkendelse. Du retter, kvalitetssikrer og sender til høring.</p>
              </div>
            </div>
          </div>
        </section>

        {/* OUTCOMES */}
        <section className="block">
          <div className="wrap">
            <div className="eyebrow">Forventede effekter</div>
            <h2 className="section-h">Estimerede effekter, baseret på den nuværende manuelle proces.</h2>
            <div className="outcomes">
              <div className="outcome">
                <div className="label">Indsamling af tovholderstatus</div>
                <div className="num">3 uger → <em>3 dage</em></div>
              </div>
              <div className="outcome">
                <div className="label">CCTF-selvevaluering ved årets start</div>
                <div className="num"><em>70 %</em> auto-udfyldt</div>
              </div>
              <div className="outcome">
                <div className="label">Skrivearbejde på selve Klimastatus</div>
                <div className="num">4 uger → <em>1 uge</em></div>
              </div>
            </div>
            <p className="disclosure">
              Tallene er estimater baseret på interviews med klimakoordinatorer i fire mellemstore kommuner og en analyse af den eksisterende rapporteringsproces. Klimastatus.dk er endnu ikke i produktion — vi opdaterer tallene med faktiske data, så snart pilotpartnere er kørt igennem en hel cyklus.
            </p>
          </div>
        </section>

        {/* ARTIFACTS */}
        <section className="block">
          <div className="wrap">
            <div className="eyebrow">Konkret materiale</div>
            <h2 className="section-h">Det her er hvad tovholderen ser. Og hvad du får tilbage.</h2>
            <p className="lede">Et workflow-værktøj er kun så stærkt som det, det producerer. To eksempler.</p>
            <div className="artifacts">
              <div className="artifact">
                <div className="head">
                  <span>Det tovholderen får</span>
                  <span className="what">e-mail</span>
                </div>
                <div className="body email-body">
                  <div className="email-from">Fra: Klimastatus &lt;ingen-svar@klimastatus.dk&gt;</div>
                  <div className="email-subject">Status på Transport for 2025 — frist 14. marts</div>
                  <p>Hej Anna,</p>
                  <p>Aarhus Kommune er ved at samle data til Klimastatus 2025. Du står som tovholder for <b>Transport</b>.</p>
                  <p>Vi har allerede hentet de fleste tal fra de offentlige datakilder. Du skal kun gennemgå og bekræfte — eller rette, hvis tallet er forkert. Det tager 10–15 minutter.</p>
                  <p><a href="#">→ Åbn dit statusskema</a></p>
                  <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 16 }}>Hvis du ikke er den rette tovholder længere, kan du melde dig fra via samme link.</p>
                </div>
              </div>
              <div className="artifact">
                <div className="head">
                  <span>Det du får tilbage</span>
                  <span className="what">CCTF-mapping</span>
                </div>
                <div className="body">
                  <ul className="toc">
                    <li><span className="n">01</span><span className="t">Resumé og hovedkonklusioner</span><span className="src">auto</span></li>
                    <li><span className="n">02</span><span className="t">Samlet udledning 2024</span><span className="src">auto</span></li>
                    <li><span className="n">03</span><span className="t">Udvikling siden basisår</span><span className="src">auto</span></li>
                    <li><span className="n">04</span><span className="t">Fagområder (7)</span><span className="src">mix</span></li>
                    <li><span className="n">05</span><span className="t">Igangsatte klimatiltag</span><span className="src">manuel</span></li>
                    <li><span className="n">06</span><span className="t">Datagrundlag og metode</span><span className="src">auto</span></li>
                    <li><span className="n">07</span><span className="t">CCTF-selvevaluering</span><span className="src">mix</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="pricing" id="priser">
          <div className="wrap">
            <div className="eyebrow">Pris</div>
            <h2 className="section-h">Én plan. Under udbudsgrænsen.</h2>
            <p className="lede">Ingen forhandling, ingen IT-udbud. Du kan tegne aftalen direkte og være i gang i næste rapporteringscyklus.</p>
            <div className="price-row">
              <div className="price-card">
                <div className="head">
                  <span className="price">3.500 kr.</span>
                  <span className="per">/ måned</span>
                </div>
                <p className="terms"><b>12 måneders binding.</b> Under udbudsgrænsen — ingen IT-udbud nødvendigt. Aftalen kan tegnes direkte under eksisterende fuldmagt.</p>
                <ul>
                  <li>Onboarding og opsætning af kommunens fagområder</li>
                  <li>Support pr. mail og telefon i hele aftaleperioden</li>
                  <li>Alle opdateringer og nye datakilder inkluderet</li>
                  <li>CCTF, DK2020 og Klimaalliancen-kompatibel rapportering</li>
                </ul>
                <div className="price-cta">
                  <a className="btn primary lg" href="#demo">Book demo <span className="arrow">→</span></a>
                </div>
              </div>
              <div className="price-compare">
                <h4>Til sammenligning</h4>
                <div className="item">
                  <div className="what">Konsulent på timepris</div>
                  <div className="meta">Typisk forløb: ekstern hjælp til skrivning og opsamling i 4–6 uger.</div>
                  <div className="cost">~140.000–220.000 kr. pr. år</div>
                </div>
                <div className="item">
                  <div className="what">SaaS-platform med udbud</div>
                  <div className="meta">Større generiske ESG-platforme, ofte over tærskelværdi.</div>
                  <div className="cost">80.000+ kr. + udbudsproces</div>
                </div>
                <div className="item">
                  <div className="what">Status quo (intern tid)</div>
                  <div className="meta">Klimakoordinator på fuld tid i 6 uger, plus 20 tovholderes tid.</div>
                  <div className="cost">~180.000 kr. i intern tid</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="block" id="faq">
          <div className="wrap narrow">
            <div className="eyebrow">Spørgsmål vi får</div>
            <h2 className="section-h">FAQ</h2>
            <div className="faq">
              <details open>
                <summary>Skal vi opgive vores eksisterende klimaregnskab?<span className="plus" /></summary>
                <p>Nej. Klimastatus.dk erstatter koordineringen og rapporteringen — ikke selve klimaregnskabet. Hvis I bruger en konsulent til metodevalg eller verifikation, fortsætter det uændret. Vi importerer jeres tal og strukturerer dem.</p>
              </details>
              <details>
                <summary>Hvor er data placeret?<span className="plus" /></summary>
                <p>Alle data opbevares på danske servere hos en ISAE 3000-revideret leverandør. AI-funktioner kører på europæisk infrastruktur. GDPR-databehandleraftale medfølger som standard. Ingen data deles med tredjeparter.</p>
              </details>
              <details>
                <summary>Kan vi få vist en konkret rapport før vi køber?<span className="plus" /></summary>
                <p>Ja. Book en demo, så går vi igennem en eksempel-rapport baseret på en anonymiseret kommunes data. Demoen tager 30 minutter, og vi sender materialet til dig som PDF bagefter.</p>
              </details>
              <details>
                <summary>Kommer det under udbudsgrænsen?<span className="plus" /></summary>
                <p>Ja. Den årlige kontraktværdi (42.000 kr.) er væsentligt under tærskelværdien for tjenesteydelser. Aftalen kan tegnes direkte under eksisterende fuldmagt uden IT-udbud.</p>
              </details>
              <details>
                <summary>Hvad sker der, hvis vi vil ud af aftalen?<span className="plus" /></summary>
                <p>Efter de første 12 måneder kan I opsige med tre måneders varsel. I beholder alle jeres data — vi udleverer dem i CSV-format og standard CCTF-XML, så I kan flytte til en anden løsning eller tilbage til eget setup.</p>
              </details>
            </div>
          </div>
        </section>

        {/* HVEM STÅR BAG */}
        <section className="block" id="hvem">
          <div className="wrap">
            <div className="eyebrow">Hvem står bag</div>
            <h2 className="section-h">To personer. Begge har siddet i den anden ende.</h2>
            <p className="lede">Klimastatus.dk er et lille, fokuseret produkt — bygget af mennesker der selv har lavet den årlige rapportering manuelt.</p>
            <div className="founders">
              <div className="founder">
                <div className="avatar">EH</div>
                <div>
                  <h4>Emil Hansen</h4>
                  <div className="role">Produkt &amp; klima</div>
                  <p>Tidligere klimakoordinator i en dansk kommune. Har skrevet 4 Klimastatus-rapporter i hånden og 1 CCTF-selvevaluering — og besluttede at det skulle være den sidste.</p>
                </div>
              </div>
              <div className="founder">
                <div className="avatar">SK</div>
                <div>
                  <h4>Sofie Kristensen</h4>
                  <div className="role">Teknik &amp; data</div>
                  <p>Tidligere data engineer i den offentlige sektor med fokus på integration mod Energistyrelsen, DST og Klimadatastyrelsen. Bygger den del der gør at tal aldrig skal indtastes to gange.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final" id="demo">
          <div className="wrap">
            <h2>Næste rapporteringscyklus starter snart.<br />Lad os tage en halv time.</h2>
            <p>En demo varer 30 minutter. Vi viser dig en konkret eksempel-rapport og svarer på dine spørgsmål om data, sikkerhed og opsætning. Du kan også få materialet skriftligt først.</p>
            <div className="actions">
              <a className="btn primary lg" href="mailto:demo@klimastatus.dk?subject=Book demo">Book demo <span className="arrow">→</span></a>
              <span className="or">eller</span>
              <a className="btn secondary lg" href="mailto:cctf@klimastatus.dk?subject=Send CCTF-mapping">Få CCTF-mapping på skrift</a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="wrap">
            <div className="footer-row">
              <a className="logo" href="#" aria-label="Klimastatus.dk">
                <span>Klimastatus<span className="period">.</span>dk</span>
              </a>
              <div className="footer-meta">
                <a href="mailto:hej@klimastatus.dk">hej@klimastatus.dk</a>
                <a href="#demo">Book demo</a>
                <a href="#faq">FAQ</a>
                <span style={{ whiteSpace: 'nowrap' }}>© 2026</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
