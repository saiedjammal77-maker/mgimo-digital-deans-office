import type { LocalizedText } from "@/lib/i18n";

type Translation = LocalizedText;
type Landmark = {
  id: string;
  name: Translation;
  label: Translation;
  description: Translation;
  anchor: [number, number, number];
  eye: [number, number, number];
};

export const officialMap = "https://mgimo.ru/territory/map/?building=a&floor=1";

export const landmarks: Landmark[] = [
  {
    id: "block-a",
    name: { en: "Block A conference hall", ru: "Конференц-зал корпуса А" },
    label: { en: "Block A", ru: "Корпус А" },
    description: {
      en: "The conference hall occupies most of this two-storey block. A passage on the first floor connects it to Block B.",
      ru: "Конференц-зал занимает большую часть двухэтажного корпуса. Переход на первом этаже связывает его с корпусом Б.",
    },
    anchor: [-7, 4.6, 4], eye: [15, 21, 32],
  },
  {
    id: "library",
    name: { en: "I. G. Tyulin Research Library", ru: "Научная библиотека имени И. Г. Тюлина" },
    label: { en: "Library", ru: "Библиотека" },
    description: {
      en: "The university’s research library bears the name of Igor Tyulin. Its reading rooms offer space for independent study between classes.",
      ru: "Научная библиотека университета носит имя Игоря Тюлина. В её читальных залах студенты могут заниматься самостоятельно между парами.",
    },
    anchor: [6, 6.8, 3.5], eye: [22, 17, 23],
  },
  {
    id: "sports",
    name: { en: "Sports centre and pool", ru: "Спортцентр и бассейн" },
    label: { en: "Sports centre", ru: "Спортцентр" },
    description: {
      en: "The sports centre brings the campus gyms and swimming pool together. Look for the sports centre and pool entry on the university map to explore its floors.",
      ru: "В спортивном центре находятся залы для тренировок и плавательный бассейн. На карте университета выберите «Спортцентр и бассейн», чтобы посмотреть планы этажей.",
    },
    anchor: [8, 3.8, -6.6], eye: [26, 20, -20],
  },
];

export const stopNumber = (index: number) => String(index + 1).padStart(2, "0");
