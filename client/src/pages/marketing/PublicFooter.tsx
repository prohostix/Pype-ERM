const CONTACT_EMAIL = 'info@pypeerm.com';
const ADDRESS = ['Prohostix', 'Office No G-07, Jav Tower', 'A-18, Sector 59, Noida', 'Uttar Pradesh 201301, India'];
const LINK = 'inline-flex items-center hover:text-white transition-colors';

const COLUMNS = [
  {
    title: 'Product',
    links: [['/features', 'Features'], ['/#preview', 'How it works'], ['/#pricing', 'Pricing'], ['/download', 'Android app']],
  },
  {
    title: 'Company',
    links: [['/why-choose-us', 'Why Choose Us'], ['/partner-with-us', 'Partner With Us'], ['/privacy-policy', 'Privacy Policy']],
  },
];

/**
 * Footer shared by the public pages.
 * Pages with their own demo form pass onBookDemo; others link to the homepage form.
 */
export function PublicFooter({ onBookDemo }: { onBookDemo?: () => void }) {
  return (
    <footer className="bg-[#091f14] text-slate-300 rounded-t-[2.5rem]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/erm-logo-green.png" alt="PYPE ERM Logo" className="w-10 h-10 object-contain" />
              <div className="flex items-baseline gap-1.5 whitespace-nowrap select-none leading-none">
                <span className="text-xl font-bold tracking-tight text-slate-400">pype</span>
                <span className="text-base font-black tracking-wider text-white">ERM</span>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed max-w-xs">One system for student data, attendance and finance. A product of Prohostix.</p>
          </div>

          {COLUMNS.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
              <ul className="text-sm">
                {links.map(([href, label]) => (
                  <li key={href}><a href={href} className={LINK}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 md:col-span-1">
            <h4 className="text-sm font-semibold text-white mb-3">Get in touch</h4>
            <ul className="text-sm">
              <li><a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>{CONTACT_EMAIL}</a></li>
              <li>
                <a
                  href="/#book-demo"
                  onClick={onBookDemo ? e => { e.preventDefault(); onBookDemo(); } : undefined}
                  className="inline-flex items-center font-semibold text-[#8ae47e] hover:text-white transition-colors"
                >
                  Book a Free Demo
                </a>
              </li>
            </ul>
            <address className="not-italic mt-3 text-sm leading-relaxed">
              {ADDRESS.map(line => <div key={line}>{line}</div>)}
            </address>
          </div>
        </div>

        <p className="mt-10 pt-6 border-t border-white/10 text-xs text-slate-400">
          © {new Date().getFullYear()} PYPE ERM by Prohostix. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
