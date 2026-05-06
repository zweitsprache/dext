export type TextsorteOption = {
  name: string;
  enabled: boolean;
};

export const DEFAULT_TEXTSORTEN: TextsorteOption[] = [
  { name: "Sachtext", enabled: true },
  { name: "Nachricht", enabled: true },
  { name: "Bericht", enabled: true },
  { name: "Porträt", enabled: true },
  { name: "Interview", enabled: true },
  { name: "Kommentar", enabled: true },
  { name: "Blog", enabled: true },
  { name: "Erzählung", enabled: true },
  { name: "Dialog", enabled: true },
  { name: "Anleitung", enabled: true },
  { name: "Brief / Mail", enabled: true },
  { name: "Werbetext / Anzeige (Inserate, Stellenanzeigen, Wohnungsinserate – sehr DaZ-relevant)", enabled: false },
  { name: "Formular (Anmeldung, Antrag – wichtig für Alltagsbewältigung)", enabled: false },
  { name: "Speisekarte / Fahrplan / Wetterbericht (diskontinuierliche Texte)", enabled: false },
  { name: "Einladung", enabled: false },
  { name: "Notiz / Mitteilung (z.B. an Mitbewohner, Kolleg:innen)", enabled: false },
  { name: "Beschwerde / Reklamation", enabled: false },
  { name: "Beschreibung", enabled: false },
  { name: "Rezension", enabled: false },
  { name: "Tagebucheintrag", enabled: false },
  { name: "Rede / Vortrag", enabled: false },
  { name: "Umfrage", enabled: false },
];

export function splitTextsorten(options: TextsorteOption[]): { enabled: string[]; disabled: string[] } {
  const sorted = [...options].sort((left, right) => left.name.localeCompare(right.name, "de"));

  return {
    enabled: sorted.filter((option) => option.enabled).map((option) => option.name),
    disabled: sorted.filter((option) => !option.enabled).map((option) => option.name),
  };
}
