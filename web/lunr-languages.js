export function setup(lunr, ...lang_list) {
    // from github.com/MihaiValentin/lunr-languages
    lunr.multiLanguage = function(/* lang1, lang2, ... */) {
        var lang = Array.prototype.slice.call(arguments);
        var nameSuffix = lang.join('-');
        var wordCharacters = "";
        var pipeline = [];
        var searchPipeline = [];
        for (var i = 0; i < lang.length; ++i) {
            if (lang[i] === 'en') {
                wordCharacters += '\\w';
                pipeline.unshift(lunr.stopWordFilter);
                pipeline.push(lunr.stemmer);
                searchPipeline.push(lunr.stemmer);
            } else {
                wordCharacters += lunr[lang[i]].wordCharacters;
                if (lunr[lang[i]].stopWordFilter) {
                    pipeline.unshift(lunr[lang[i]].stopWordFilter);
                }
                if (lunr[lang[i]].stemmer) {
                    pipeline.push(lunr[lang[i]].stemmer);
                    searchPipeline.push(lunr[lang[i]].stemmer);
                }
            }
        };
        var multiTrimmer = generateTrimmer(wordCharacters);
        lunr.Pipeline.registerFunction(multiTrimmer,
                                       'lunr-multi-trimmer-' + nameSuffix);
        pipeline.unshift(multiTrimmer);

        return function() {
            this.pipeline.reset();
            this.pipeline.add.apply(this.pipeline, pipeline);
            this.searchPipeline.reset();
            this.searchPipeline.add.apply(this.searchPipeline, searchPipeline);
        }
    }

    lang_list.forEach(v => this[v](lunr))
}

export function uk(lunr) {
    lunr.uk = {}
    lunr.uk.wordCharacters =
        "\u0404\u0406\u0407" +          // Є І Ї  (uppercase)
        "\u0410-\u0429" +               // А–Щ    (uppercase, contiguous)
        "\u042C" +                      // Ь      (uppercase)
        "\u042E\u042F" +                // Ю Я    (uppercase)
        "\u0430-\u0449" +               // а–щ    (lowercase, contiguous)
        "\u044C" +                      // ь      (lowercase)
        "\u044E\u044F" +                // ю я    (lowercase)
        "\u0454\u0456\u0457" +          // є і ї  (lowercase)
        "\u0490\u0491";                 // Ґ ґ
    lunr.uk.trimmer = generateTrimmer(lunr.uk.wordCharacters)
    lunr.Pipeline.registerFunction(lunr.uk.trimmer, 'trimmer-ua')

    lunr.uk.stopWordFilter = [
        // Pronouns
        "я", "ти", "він", "вона", "воно", "ми", "ви", "вони",
        // genitive / dative / accusative / instrumental forms
        "мене", "мені", "мною",
        "тебе", "тобі", "тобою",
        "його", "йому", "ним",
        "її", "їй", "нею",
        "нас", "нам", "нами",
        "вас", "вам", "вами",
        "їх", "їм", "ними",
        // reflexive
        "себе", "собі", "собою",
        // possessive
        "мій", "моя", "моє", "мої",
        "твій", "твоя", "твоє", "твої",
        "його", "її", "їхній", "їхня", "їхнє", "їхні",
        "наш", "наша", "наше", "наші",
        "ваш", "ваша", "ваше", "ваші",
        // demonstrative
        "цей", "ця", "це", "ці",
        "той", "та", "те", "ті",
        "такий", "така", "таке", "такі",
        // relative / interrogative
        "хто", "що", "який", "яка", "яке", "які",
        "котрий", "котра", "котре", "котрі",
        "чий", "чия", "чиє", "чиї",
        // indefinite
        "хтось", "щось", "якийсь", "якась", "якесь",
        "хтонебудь", "щонебудь",
        "ніхто", "ніщо", "ніякий",
        "дехто", "дещо", "деякий",
        // universal
        "кожен", "кожна", "кожне", "кожні",
        "весь", "вся", "все", "всі", "всього", "всіх", "всім",
        "інший", "інша", "інше", "інші",
        // "To be" & auxiliary verbs
        "є", "бути",
        "був", "була", "було", "були",
        "буду", "будеш", "буде", "будемо", "будете", "будуть",
        "бував", "бувала", "бувало", "бували",
        // Prepositions
        "в", "у", "уві",
        "на", "по", "за", "від", "од",
        "до", "з", "зі", "із",
        "під", "піді", "над", "між",
        "про", "при", "біля", "коло",
        "перед", "після", "через", "для",
        "без", "крім", "окрім", "замість",
        "всупереч", "незважаючи", "завдяки",
        "навколо", "посеред", "серед", "вздовж",
        "вниз", "вгору", "вперед", "назад",
        // Conjunctions
        "і", "й", "та", "а", "але", "проте", "однак", "зате",
        "або", "чи", "або", "ні", "то",
        "що", "як", "бо", "тому", "тому що", "через те що",
        "коли", "якщо", "якби", "хоч", "хоча",
        "поки", "доки", "щоб", "аби",
        "ніж", "чим", "хоч", "дарма що",
        "також", "теж", "притому", "причому",
        "щойно", "тільки но", "ледве",
        // Particles
        "не", "ні", "ані",
        "ж", "же", "б", "би",
        "хай", "нехай", "навіть",
        "лише", "тільки", "тільки-но",
        "ще", "вже", "ось", "от", "он",
        "саме", "якраз", "просто",
        "майже", "ледве", "ледь",
        // Adverbs
        "тут", "там", "де", "куди", "звідки", "звідти",
        "зараз", "тоді", "коли", "завжди", "ніколи",
        "часто", "рідко", "іноді", "інколи",
        "дуже", "досить", "достатньо", "трохи",
        "так", "ні", "так так",
        "чому", "навіщо", "навіть", "тому",
        "потім", "спочатку", "раніше", "пізніше",
        "разом", "окремо", "взагалі", "зокрема",
        "можливо", "мабуть", "певно", "напевно",
        // Common short verbs
        "мати", "має", "мають", "мав", "мала", "мали",
        "могти", "може", "можуть", "міг", "могла", "могли",
        "мусити", "мусить", "мусять",
        "хотіти", "хоче", "хочуть", "хотів", "хотіла",
        "йти", "іти", "йде", "ідуть", "ішов", "ішла",
        "знати", "знає", "знають", "знав", "знала",
        "сказати", "казати", "каже", "кажуть",
        "робити", "робить", "роблять",
        "стати", "стає", "стають",
        "дати", "дає", "дають",
        "взяти", "бере", "беруть",
        "треба", "потрібно", "необхідно", "слід", "варто",
    ]
    lunr.uk.stopWordFilter = lunr.generateStopWordFilter(lunr.uk.stopWordFilter)
    lunr.Pipeline.registerFunction(lunr.uk.stopWordFilter, 'stopWordFilter-ua')

    lunr.uk.stemmer = function(token) {
        return token.update(function(word) {
            return ukrstemmer(word)
        })
    }
    lunr.Pipeline.registerFunction(lunr.uk.stemmer, 'stemmer-uk')
}

function generateTrimmer(wordCharacters) {
    var startRegex = new RegExp("^[^" + wordCharacters + "]+")
    var endRegex = new RegExp("[^" + wordCharacters + "]+$")

    return function(token) {
        return token.update(function (s) {
            return s.replace(startRegex, '').replace(endRegex, '')
        })
    }
}

// from github.com/titarenko/ukrstemmer
function ukrstemmer(word) {
    var PERFECTIVEGROUND = /((ив|ивши|ившись|ыв|ывши|ывшись(в|вши|вшись)))$/;
    var REFLEXIVE = /(с[яьи])$/;  // http://uk.wikipedia.org/wiki/Рефлексивне_дієслово
    var ADJECTIVE = /(ими|ій|ий|а|е|ова|ове|ів|є|їй|єє|еє|я|ім|ем|им|ім|их|іх|ою|йми|іми|у|ю|ого|ому|ої)$/; //http://uk.wikipedia.org/wiki/Прикметник + http://wapedia.mobi/uk/Прикметник
    var PARTICIPLE = /(ий|ого|ому|им|ім|а|ій|у|ою|ій|і|их|йми|их)$/; //http://uk.wikipedia.org/wiki/Дієприкметник
    var VERB = /(сь|ся|ив|ать|ять|у|ю|ав|али|учи|ячи|вши|ши|е|ме|ати|яти|є)$/; //http://uk.wikipedia.org/wiki/Дієслово
    var NOUN = /(а|ев|ов|е|ями|ами|еи|и|ей|ой|ий|й|иям|ям|ием|ем|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я|і|ові|ї|ею|єю|ою|є|еві|ем|єм|ів|їв|\'ю)$/; //http://uk.wikipedia.org/wiki/Іменник
    var RVRE = /^(.*?[аеиоуюяіїє])(.*)$/;
    var DERIVATIONAL = /[^аеиоуюяіїє][аеиоуюяіїє]+[^аеиоуюяіїє]+[аеиоуюяіїє].*сть?$/;

    if (word == null || !word.length) {
        return word;
    }
    word = word.toLowerCase();
    var stem = word;
    do {
        var p = word.match(RVRE);
        if (!p) break;

        var start = p[1];
        var RV = p[2];
        if (!RV) break;

        // Step 1
        var m = RV.replace(PERFECTIVEGROUND, '');
        if (m === RV) {
            RV = RV.replace(REFLEXIVE, '');

            m = RV.replace(ADJECTIVE, '');
            if (m === RV) {
                RV = RV.replace(PARTICIPLE, '');
            } else {
                RV = m;
                m = RV.replace(VERB, '');
                if (m === RV) {
                    RV = RV.replace(NOUN, '');
                } else {
                    RV = m;
                }
            }
        } else {
            RV = m;
        }

        // Step 2
        RV = RV.replace(/и$/, '');

        // Step 3
        if (DERIVATIONAL.test(RV)) {
            RV = RV.replace(/ость?$/, '');
        }

        // Step 4
        m = RV.replace(/ь$/, '');
        if (m === RV) {
            RV = RV.replace(/ейше?/, '');
            RV = RV.replace(/нн$/, 'н');
        } else {
            RV = m;
        }

        stem = start + RV;
    } while(false);
    return stem;
}
