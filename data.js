const alphabetData = [
  { upper: "А", lower: "а", sound: "a", example: "Арбуз", exampleMeaning: "西瓜" },
  { upper: "Б", lower: "б", sound: "b", example: "Банан", exampleMeaning: "香蕉" },
  { upper: "В", lower: "в", sound: "v", example: "Вода", exampleMeaning: "水" },
  { upper: "Г", lower: "г", sound: "g", example: "Город", exampleMeaning: "城市" },
  { upper: "Д", lower: "д", sound: "d", example: "Дом", exampleMeaning: "房子" },
  { upper: "Е", lower: "е", sound: "ye", example: "Ель", exampleMeaning: "云杉" },
  { upper: "Ё", lower: "ё", sound: "yo", example: "Ёж", exampleMeaning: "刺猬" },
  { upper: "Ж", lower: "ж", sound: "zh", example: "Жираф", exampleMeaning: "长颈鹿" },
  { upper: "З", lower: "з", sound: "z", example: "Зима", exampleMeaning: "冬天" },
  { upper: "И", lower: "и", sound: "i", example: "Игра", exampleMeaning: "游戏" },
  { upper: "Й", lower: "й", sound: "y", example: "Йогурт", exampleMeaning: "酸奶" },
  { upper: "К", lower: "к", sound: "k", example: "Кот", exampleMeaning: "猫" },
  { upper: "Л", lower: "л", sound: "l", example: "Лес", exampleMeaning: "森林" },
  { upper: "М", lower: "м", sound: "m", example: "Мама", exampleMeaning: "妈妈" },
  { upper: "Н", lower: "н", sound: "n", example: "Небо", exampleMeaning: "天空" },
  { upper: "О", lower: "о", sound: "o", example: "Окно", exampleMeaning: "窗户" },
  { upper: "П", lower: "п", sound: "p", example: "Папа", exampleMeaning: "爸爸" },
  { upper: "Р", lower: "р", sound: "r", example: "Рыба", exampleMeaning: "鱼" },
  { upper: "С", lower: "с", sound: "s", example: "Солнце", exampleMeaning: "太阳" },
  { upper: "Т", lower: "т", sound: "t", example: "Тигр", exampleMeaning: "老虎" },
  { upper: "У", lower: "у", sound: "u", example: "Утро", exampleMeaning: "早晨" },
  { upper: "Ф", lower: "ф", sound: "f", example: "Фрукт", exampleMeaning: "水果" },
  { upper: "Х", lower: "х", sound: "kh", example: "Хлеб", exampleMeaning: "面包" },
  { upper: "Ц", lower: "ц", sound: "ts", example: "Цветок", exampleMeaning: "花" },
  { upper: "Ч", lower: "ч", sound: "ch", example: "Чай", exampleMeaning: "茶" },
  { upper: "Ш", lower: "ш", sound: "sh", example: "Школа", exampleMeaning: "学校" },
  { upper: "Щ", lower: "щ", sound: "shch", example: "Щенок", exampleMeaning: "小狗" },
  { upper: "Ъ", lower: "ъ", sound: "(硬音符号，不发音)", example: "Подъезд", exampleMeaning: "入口" },
  { upper: "Ы", lower: "ы", sound: "y", example: "Мышь", exampleMeaning: "老鼠" },
  { upper: "Ь", lower: "ь", sound: "(软音符号，不发音)", example: "День", exampleMeaning: "白天" },
  { upper: "Э", lower: "э", sound: "e", example: "Это", exampleMeaning: "这个" },
  { upper: "Ю", lower: "ю", sound: "yu", example: "Юбка", exampleMeaning: "裙子" },
  { upper: "Я", lower: "я", sound: "ya", example: "Яблоко", exampleMeaning: "苹果" }
];

const vocabData = [
  {
    category: "问候语",
    words: [
      { ru: "Привет", zh: "你好（非正式）" },
      { ru: "Здравствуйте", zh: "您好（正式）" },
      { ru: "Пока", zh: "再见（非正式）" },
      { ru: "До свидания", zh: "再见（正式）" },
      { ru: "Спасибо", zh: "谢谢" },
      { ru: "Пожалуйста", zh: "不客气 / 请" },
      { ru: "Извините", zh: "对不起" },
      { ru: "Да", zh: "是" },
      { ru: "Нет", zh: "不是" }
    ]
  },
  {
    category: "数字",
    words: [
      { ru: "Один", zh: "一" },
      { ru: "Два", zh: "二" },
      { ru: "Три", zh: "三" },
      { ru: "Четыре", zh: "四" },
      { ru: "Пять", zh: "五" },
      { ru: "Шесть", zh: "六" },
      { ru: "Семь", zh: "七" },
      { ru: "Восемь", zh: "八" },
      { ru: "Девять", zh: "九" },
      { ru: "Десять", zh: "十" }
    ]
  },
  {
    category: "日常用语",
    words: [
      { ru: "Как дела?", zh: "你怎么样？" },
      { ru: "Меня зовут...", zh: "我叫……" },
      { ru: "Сколько это стоит?", zh: "这个多少钱？" },
      { ru: "Где туалет?", zh: "厕所在哪里？" },
      { ru: "Я не понимаю", zh: "我不明白" },
      { ru: "Помогите!", zh: "救命！" },
      { ru: "Который час?", zh: "现在几点？" }
    ]
  },
  {
    category: "家庭成员",
    words: [
      { ru: "Мама", zh: "妈妈" },
      { ru: "Папа", zh: "爸爸" },
      { ru: "Сын", zh: "儿子" },
      { ru: "Дочь", zh: "女儿" },
      { ru: "Брат", zh: "哥哥/弟弟" },
      { ru: "Сестра", zh: "姐姐/妹妹" }
    ]
  }
];
