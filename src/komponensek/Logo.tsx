/**
 * A márkajel és a teljes logó.
 *
 * A geometria a designcsomagból való (`04-dizajn/logo/`), pixelre ugyanaz:
 * 56-os viewBox, ezek a path-ok, ezek a hexák. Ezért nem `currentColor`: a
 * jelet nem szabad átszínezni, elforgatni, lekerekíteni vagy árnyékolni — a
 * saját hátterét hozza magával, tehát színes felületen is megáll magában.
 */
export function Jel({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="56" height="56" fill="#be6846" />
      <path d="M14 11 H34 L42 19 V45 H14 Z" fill="#f5ece2" />
      <path d="M18 27 C22 23, 26 31, 30 27 S38 23, 38 27" stroke="#be6846" strokeWidth="3" fill="none" />
      <path d="M18 35 C22 31, 26 39, 30 35 S38 31, 38 35" stroke="#be6846" strokeWidth="3" fill="none" />
    </svg>
  );
}

/**
 * A teljes logó: jel + szóvédjegy, balra zárva, egy sorban.
 *
 * A „SzámlaFolyó" **egyetlen szó, két színnel** — nem két szó egymás mellett,
 * ezért nincs köztük szóköz és nem törhet. A `Folyó` rész a márkaszínt viszi,
 * és linkben állva sötétebbre vált; ezt a `.logo-folyo` osztály intézi a
 * designrendszerben, nem itt.
 *
 * A designcsomag alsó határa: a jel ne legyen 28 pixelnél, a szöveg 20-nál
 * kisebb ott, ahol ez azonosít.
 */
export function LogoSor({
  jel = 'h-7 w-7',
  szoveg = 'text-xl',
  className = '',
}: {
  jel?: string;
  szoveg?: string;
  className?: string;
}) {
  return (
    <span className={`logo-sor ${className}`}>
      <Jel className={jel} />
      <span className={`logo-szoveg ${szoveg}`}>
        Számla<span className="logo-folyo">Folyó</span>
      </span>
    </span>
  );
}
