-- Az automatikus jóváhagyás alapból kikapcsolva.
--
-- # Miért
--
-- A termék ígérete megváltozott, és ezúttal a **szűkebb** irányba. A gépi
-- jóváhagyás eddig alapértelmezés volt (`default true`), és hogy mégsem sült
-- el, azt kizárólag a 20 bizonylatos bemelegítés intézte
-- (`shared/uzleti/kapuk.ts`): a 21. bizonylattól a rendszer magától kezdett
-- volna jóváhagyni. Az élesben végigvitt folyamat után az a döntés született,
-- hogy **minden bizonylat emberhez kerüljön** — és a nyitólap, az ÁSZF és az
-- Adatkezelési tájékoztató is ezt mondja innentől.
--
-- Egy ígéret, amit a kód nem tart be, ebben a projektben hiba — akkor is, ha
-- a kód a bőkezűbb. Ezért nem elég a szöveget átírni: az alapértéknek is
-- billennie kell.
--
-- # Amit a gépezet **nem** veszít
--
-- A `kapuk.ts`, a mintavétel, az `auto_jovahagyva`/`auto_indok` oszlop és a
-- Beállítások kapcsolója mind a helyén marad. Aki kifejezetten kéri, továbbra
-- is bekapcsolhatja, a bemelegítéssel és a jelvénnyel együtt. Csak nincs olyan
-- nyilvános szöveg, ami ígérné.
--
-- # A meglévő sorok átírásáról
--
-- Az `update` nem ír felül döntést: ezt a kapcsolót **soha senki nem
-- kapcsolta be**. Az érték minden soron a 20260912000100 migráció
-- alapértéke volt, nem választás — élő előfizető pedig nincs.

alter table public.companies
  alter column auto_jovahagyas_be set default false;

update public.companies
   set auto_jovahagyas_be = false
 where auto_jovahagyas_be;

comment on column public.companies.auto_jovahagyas_be is
  'Gépi jóváhagyás. Alapból KI: minden bizonylat emberi jóváhagyásra vár. '
  'Bekapcsolva a kapuk.ts hét kapuja dönt, a 20 bizonylatos bemelegítéssel '
  'és az 1/20 mintavétellel együtt. Lásd a 20260915000100 migrációt.';
