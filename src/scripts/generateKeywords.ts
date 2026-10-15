import { writeCsv } from "../dataset/csv";
import type {
  Keyword,
  KeywordType,
  Language,
  ThreatSubtype,
} from "../types/dataset";

interface LexiconSeed {
  ruTargets: string[];
  kkTargets: string[];
  ruActions: string[];
  kkActions: string[];
}

const SUBTYPES: ThreatSubtype[] = [
  "ETHNIC_HATE",
  "RACIAL_HATE",
  "RELIGIOUS_HATE",
  "GENDER_HATE",
  "SEXUAL_ORIENTATION_HATE",
  "DISABILITY_HATE",
  "SOCIAL_CLASS_HATE",
  "DEHUMANIZATION",
  "GROUP_EXCLUSION",
  "GROUP_VIOLENCE_INCITEMENT",
];

const LANGUAGES: Language[] = ["RU", "KK", "MIXED"];

const SEEDS: Record<ThreatSubtype, LexiconSeed> = {
  ETHNIC_HATE: {
    ruTargets: ["казахи", "русские", "узбеки", "уйгуры", "татары", "корейцы", "мигранты", "приезжие", "другая национальность", "этническая группа"],
    kkTargets: ["қазақтар", "орыстар", "өзбектер", "ұйғырлар", "татарлар", "кәрістер", "мигранттар", "келімсектер", "басқа ұлт", "этникалық топ"],
    ruActions: ["ненавижу", "терпеть не могу", "хуже всех", "не должны жить здесь", "все одинаковые", "чужие", "убирайтесь", "не пускать", "изгнать", "не люди"],
    kkActions: ["жек көремін", "шыдай алмаймын", "бәрінен жаман", "мұнда тұрмауы керек", "бәрі бірдей", "бөтен", "кетіңдер", "кіргізбеу", "қуып жіберу", "адам емес"],
  },
  RACIAL_HATE: {
    ruTargets: ["люди другой расы", "темнокожие", "чернокожие", "азиаты", "белые", "смуглые", "другой цвет кожи", "расовое меньшинство", "чужая раса", "небелые"],
    kkTargets: ["басқа нәсіл адамдары", "қара нәсілділер", "азиялықтар", "ақ нәсілділер", "қараторы адамдар", "басқа тері түсі", "нәсілдік азшылық", "бөтен нәсіл", "ақ емес адамдар", "өзге нәсіл"],
    ruActions: ["ненавижу", "ниже нас", "хуже людей", "не место здесь", "не принимать", "держаться подальше", "не пускать", "изгнать", "опасная раса", "не люди"],
    kkActions: ["жек көремін", "бізден төмен", "адамнан жаман", "мұнда орын жоқ", "қабылдамау", "аулақ жүру", "кіргізбеу", "қуып жіберу", "қауіпті нәсіл", "адам емес"],
  },
  RELIGIOUS_HATE: {
    ruTargets: ["мусульмане", "христиане", "атеисты", "верующие", "неверующие", "православные", "католики", "религиозная группа", "другая вера", "сектанты"],
    kkTargets: ["мұсылмандар", "христиандар", "атеистер", "діндарлар", "дінсіздер", "православтар", "католиктер", "діни топ", "басқа дін", "секта мүшелері"],
    ruActions: ["ненавижу", "запретить веру", "не место здесь", "все фанатики", "опасная религия", "не принимать", "изгнать", "закрыть храмы", "чужая вера", "не люди"],
    kkActions: ["жек көремін", "дінге тыйым салу", "мұнда орын жоқ", "бәрі фанатик", "қауіпті дін", "қабылдамау", "қуып жіберу", "ғибадатханаларды жабу", "бөтен дін", "адам емес"],
  },
  GENDER_HATE: {
    ruTargets: ["женщины", "мужчины", "девушки", "парни", "матери", "отцы", "феминистки", "домохозяйки", "женский пол", "мужской пол"],
    kkTargets: ["әйелдер", "ерлер", "қыздар", "жігіттер", "аналар", "әкелер", "феминистер", "үй шаруасындағы әйелдер", "әйел жынысы", "ер жынысы"],
    ruActions: ["ненавижу", "глупее", "не способны", "должны молчать", "не место на работе", "хуже", "все одинаковые", "нельзя доверять", "изгнать", "не люди"],
    kkActions: ["жек көремін", "ақылы төмен", "қабілетсіз", "үндемеуі керек", "жұмыста орын жоқ", "нашар", "бәрі бірдей", "сенуге болмайды", "қуып жіберу", "адам емес"],
  },
  SEXUAL_ORIENTATION_HATE: {
    ruTargets: ["лгбт", "геи", "лесбиянки", "бисексуалы", "гомосексуалы", "люди другой ориентации", "однополые пары", "квир люди", "сексуальные меньшинства", "нетрадиционная ориентация"],
    kkTargets: ["лгбт", "гейлер", "лесбияндар", "бисексуалдар", "гомосексуалдар", "басқа бағдардағы адамдар", "бір жынысты жұптар", "квир адамдар", "жыныстық азшылықтар", "дәстүрлі емес бағдар"],
    ruActions: ["ненавижу", "запретить", "не место здесь", "изгнать", "лечить насильно", "не принимать", "скрывать", "хуже людей", "опасны", "не люди"],
    kkActions: ["жек көремін", "тыйым салу", "мұнда орын жоқ", "қуып жіберу", "мәжбүрлеп емдеу", "қабылдамау", "жасыру", "адамнан жаман", "қауіпті", "адам емес"],
  },
  DISABILITY_HATE: {
    ruTargets: ["люди с инвалидностью", "инвалиды", "люди на колясках", "незрячие", "глухие", "люди с аутизмом", "люди с особенностями", "ограниченные люди", "нетрудоспособные", "больные люди"],
    kkTargets: ["мүгедектігі бар адамдар", "мүгедектер", "арбамен жүретіндер", "зағиптар", "саңыраулар", "аутизмі бар адамдар", "ерекше қажеттілігі бар адамдар", "мүмкіндігі шектеулі жандар", "еңбекке жарамсыздар", "науқас адамдар"],
    ruActions: ["ненавижу", "бесполезны", "обуза", "не брать на работу", "не пускать", "изолировать", "хуже других", "не нужны", "изгнать", "не люди"],
    kkActions: ["жек көремін", "пайдасыз", "масыл", "жұмысқа алмау", "кіргізбеу", "оқшаулау", "басқалардан төмен", "керек емес", "қуып жіберу", "адам емес"],
  },
  SOCIAL_CLASS_HATE: {
    ruTargets: ["бедные", "богатые", "безработные", "бездомные", "сельские", "горожане", "рабочие", "элита", "малоимущие", "социальный класс"],
    kkTargets: ["кедейлер", "байлар", "жұмыссыздар", "үйсіздер", "ауылдықтар", "қалалықтар", "жұмысшылар", "элита", "табысы аздар", "әлеуметтік тап"],
    ruActions: ["ненавижу", "сами виноваты", "ленивые", "не пускать", "не давать работу", "хуже других", "не достойны", "изгнать", "опасны", "не люди"],
    kkActions: ["жек көремін", "өздері кінәлі", "жалқау", "кіргізбеу", "жұмыс бермеу", "басқалардан төмен", "лайық емес", "қуып жіберу", "қауіпті", "адам емес"],
  },
  DEHUMANIZATION: {
    ruTargets: ["эта группа", "эти люди", "они", "чужаки", "меньшинство", "приезжие", "инакомыслящие", "не такие как мы", "чужая община", "вся их группа"],
    kkTargets: ["бұл топ", "бұл адамдар", "олар", "бөтендер", "азшылық", "келімсектер", "өзгеше ойлайтындар", "бізге ұқсамайтындар", "бөтен қауым", "олардың бүкіл тобы"],
    ruActions: ["не люди", "животные", "паразиты", "мусор", "зараза", "вредители", "стадо", "грязь", "не заслуживают жизни", "человеческого в них нет"],
    kkActions: ["адам емес", "хайуандар", "арамтамақтар", "қоқыс", "індет", "зиянкестер", "табын", "лас", "өмір сүруге лайық емес", "адамгершілігі жоқ"],
  },
  GROUP_EXCLUSION: {
    ruTargets: ["эту группу", "этих людей", "чужаков", "мигрантов", "меньшинство", "инакомыслящих", "другую общину", "не таких как мы", "всех их", "их представителей"],
    kkTargets: ["бұл топты", "бұл адамдарды", "бөтендерді", "мигранттарды", "азшылықты", "өзгеше ойлайтындарды", "басқа қауымды", "бізге ұқсамайтындарды", "олардың бәрін", "олардың өкілдерін"],
    ruActions: ["изгнать", "выслать", "не пускать", "запретить въезд", "уволить", "не принимать", "лишить прав", "отделить", "закрыть доступ", "убрать отсюда"],
    kkActions: ["қуып жіберу", "жер аудару", "кіргізбеу", "кіруге тыйым салу", "жұмыстан шығару", "қабылдамау", "құқығынан айыру", "бөліп тастау", "жолын жабу", "бұл жерден кетіру"],
  },
  GROUP_VIOLENCE_INCITEMENT: {
    ruTargets: ["эту группу", "этих людей", "чужаков", "мигрантов", "меньшинство", "инакомыслящих", "другую общину", "не таких как мы", "всех их", "их представителей"],
    kkTargets: ["бұл топты", "бұл адамдарды", "бөтендерді", "мигранттарды", "азшылықты", "өзгеше ойлайтындарды", "басқа қауымды", "бізге ұқсамайтындарды", "олардың бәрін", "олардың өкілдерін"],
    ruActions: ["атаковать", "избить", "уничтожить", "сжечь", "напасть", "расправиться", "сломать", "выследить", "наказать силой", "применить насилие"],
    kkActions: ["шабуыл жасау", "ұрып-соғу", "жою", "өртеу", "бас салу", "күшпен жазалау", "талқандау", "ізіне түсу", "зорлықпен жазалау", "күш қолдану"],
  },
};

const RU_TEMPLATES = [
  "{action} {target}",
  "я {action} {target}",
  "надо {action} {target}",
  "нужно {action} {target}",
  "всегда {action} {target}",
  "давайте {action} {target}",
  "пора {action} {target}",
  "следует {action} {target}",
  "хочу {action} {target}",
  "мы должны {action} {target}",
  "они говорят {action} {target}",
  "призывают {action} {target}",
];

const KK_TEMPLATES = [
  "{target} {action}",
  "мен {target} {action}",
  "{target} туралы {action}",
  "{target} бәрін {action}",
  "{target} қазір {action}",
  "{target} міндетті түрде {action}",
  "{target} үнемі {action}",
  "{target} қарсы {action}",
  "{target} керек болса {action}",
  "{target} біз {action}",
  "олар {target} {action} дейді",
  "{target} жұрт {action} деп шақырады",
];

const ANTONYM_RU = ["уважать", "защищать", "принимать", "поддерживать"];
const ANTONYM_KK = ["құрметтеу", "қорғау", "қабылдау", "қолдау"];

function fill(template: string, action: string, target: string): string {
  return template.replace("{action}", action).replace("{target}", target);
}

function obfuscate(text: string): string {
  return text.replace(/[аео]/giu, (letter) => ({ а: "@", е: "3", о: "0" })[letter.toLowerCase()] ?? letter);
}

function compact(text: string): string {
  return text.replace(/\s+/g, "");
}

function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: "a", ә: "a", б: "b", в: "v", г: "g", ғ: "gh", д: "d",
    е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y", к: "k",
    қ: "q", л: "l", м: "m", н: "n", ң: "ng", о: "o", ө: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ұ: "u", ү: "u",
    ф: "f", х: "kh", һ: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ы: "y", і: "i", э: "e", ю: "yu", я: "ya",
    ъ: "", ь: "",
  };
  return [...text.toLocaleLowerCase()].map((letter) => map[letter] ?? letter).join("");
}

function buildPool(subtype: ThreatSubtype, language: Language): Array<{ keyword: string; type: KeywordType; comment: string }> {
  const seed = SEEDS[subtype];
  const rows: Array<{ keyword: string; type: KeywordType; comment: string }> = [];
  const targets = language === "KK" ? seed.kkTargets : seed.ruTargets;
  const actions = language === "KK" ? seed.kkActions : seed.ruActions;
  const templates = language === "KK" ? KK_TEMPLATES : RU_TEMPLATES;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!;
    for (let actionIndex = 0; actionIndex < actions.length; actionIndex += 1) {
      const action = actions[actionIndex]!;
      const template = templates[(index + actionIndex) % templates.length]!;
      const phrase = language === "MIXED"
        ? `${seed.kkTargets[index]!} ${action}`
        : fill(template, action, target);
      rows.push({ keyword: phrase, type: language === "MIXED" ? "MIXED" : "PHRASE", comment: "Generated candidate; manual native-speaker review required" });
      rows.push({ keyword: obfuscate(phrase), type: "OBFUSCATED", comment: "Generated symbol-substitution candidate" });
      rows.push({ keyword: compact(phrase), type: "MISSPELLING", comment: "Generated no-space spelling candidate" });
      rows.push({ keyword: transliterate(phrase), type: "TRANSLITERATION", comment: "Generated Cyrillic-to-Latin transliteration candidate" });
    }
  }

  const antonyms = language === "KK" ? ANTONYM_KK : ANTONYM_RU;
  for (const target of targets) {
    for (const antonym of antonyms) {
      rows.push({
        keyword: language === "KK" ? `${target} ${antonym}` : `${antonym} ${target}`,
        type: "ANTONYM_CONTEXT",
        comment: "Counter-speech or negated context; review as AMBIGUOUS, never auto-approve alone",
      });
    }
  }
  return rows;
}

async function main(): Promise<void> {
  const rows: Keyword[] = [];
  let bucketIndex = 0;

  for (const subtype of SUBTYPES) {
    for (const language of LANGUAGES) {
      const quota = bucketIndex < 10 ? 134 : 133;
      const pool = buildPool(subtype, language);
      const localSeen = new Set<string>();
      const selected: typeof pool = [];
      const selectUnique = (candidates: typeof pool, limit: number): void => {
        for (const candidate of candidates) {
          const key = candidate.keyword.toLocaleLowerCase();
          if (localSeen.has(key)) continue;
          localSeen.add(key);
          selected.push(candidate);
          if (selected.length === limit) return;
        }
      };
      selectUnique(
        pool.filter((candidate) => candidate.type !== "ANTONYM_CONTEXT"),
        quota - 10,
      );
      selectUnique(
        pool.filter((candidate) => candidate.type === "ANTONYM_CONTEXT"),
        quota,
      );

      for (const candidate of selected) {
        rows.push({
          keyword_id: `KW_${String(rows.length + 1).padStart(5, "0")}`,
          threat_family: "HATE_AND_DISCRIMINATION",
          target_subtype: subtype,
          language,
          keyword: candidate.keyword,
          keyword_type: candidate.type,
          source: "GENERATED_SEED_AND_TEMPLATE_V1",
          review_status: "PENDING",
          review_comment: candidate.comment,
        });
      }
      if (selected.length !== quota) throw new Error(`Insufficient unique keywords for ${subtype}/${language}: ${selected.length}/${quota}`);
      bucketIndex += 1;
    }
  }

  if (rows.length !== 4_000) throw new Error(`Expected 4000 rows, generated ${rows.length}`);
  await writeCsv("keywords/01_keywords_pending.csv", rows);
  console.log(`Generated ${rows.length} keyword candidates`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
