using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace JijiiKobushi.Stage1Prototype
{
    public static class StageJsonLoader
    {
        public static StageExport LoadStage(string path)
        {
            var root = AsObject(ParseFile(path), path);
            var stage = new StageExport
            {
                SchemaVersion = GetInt(root, "schemaVersion"),
                GameId = GetString(root, "gameId"),
                ExportId = GetString(root, "exportId"),
                Stage = ReadStageMeta(GetObject(root, "stage")),
                Audio = ReadAudio(GetObject(root, "audio")),
                Rhythm = ReadRhythm(GetObject(root, "rhythm")),
                Player = ReadPlayer(GetObject(root, "player")),
                Enemy = ReadEnemy(GetObject(root, "enemy")),
                Difficulty = ReadDifficultyMap(GetObject(root, "difficulty")),
                Charts = ReadCharts(GetObject(root, "charts"))
            };
            return stage;
        }

        public static ExpectedResults LoadExpectedResults(string path)
        {
            var root = AsObject(ParseFile(path), path);
            return new ExpectedResults
            {
                Timing = ReadExpectedTiming(GetObject(root, "timing")),
                Profiles = ReadExpectedProfiles(GetObject(root, "profiles"))
            };
        }

        private static object ParseFile(string path)
        {
            if (string.IsNullOrWhiteSpace(path))
            {
                throw new ArgumentException("JSON path is required.", "path");
            }

            return MiniJsonParser.Parse(File.ReadAllText(path));
        }

        private static StageMeta ReadStageMeta(Dictionary<string, object> obj)
        {
            return new StageMeta
            {
                Id = GetString(obj, "id"),
                Index = GetInt(obj, "index"),
                Title = GetString(obj, "title"),
                Bpm = GetInt(obj, "bpm"),
                TravelMs = GetInt(obj, "travelMs")
            };
        }

        private static AudioData ReadAudio(Dictionary<string, object> obj)
        {
            var bgm = GetObject(obj, "bgm");
            var timing = GetObject(obj, "timing");
            return new AudioData
            {
                Bgm = new BgmData
                {
                    Cue = GetString(bgm, "cue"),
                    Track = GetString(bgm, "track"),
                    Gain = GetDouble(bgm, "gain"),
                    Lead = GetInt(bgm, "lead"),
                    AssetKey = GetString(bgm, "assetKey"),
                    AssetSrc = GetString(bgm, "assetSrc"),
                    TrackVolume = GetDouble(bgm, "trackVolume")
                },
                Timing = new AudioTimingData
                {
                    CountInLeadSeconds = GetDouble(timing, "countInLeadSeconds"),
                    ChartStartReference = GetString(timing, "chartStartReference"),
                    BattleDurationPaddingMs = GetInt(timing, "battleDurationPaddingMs"),
                    BgmStopPaddingMs = GetInt(timing, "bgmStopPaddingMs"),
                    InputOffsetMsDefault = GetInt(timing, "inputOffsetMsDefault")
                }
            };
        }

        private static RhythmData ReadRhythm(Dictionary<string, object> obj)
        {
            return new RhythmData
            {
                NoteTypes = ReadStringList(GetList(obj, "noteTypes")),
                WindowsMs = ReadWindows(GetObject(obj, "windowsMs")),
                InputGraceMs = GetInt(obj, "inputGraceMs"),
                MashInputGraceMs = GetInt(obj, "mashInputGraceMs"),
                MashDedupMinGapMs = GetInt(obj, "mashDedupMinGapMs"),
                JudgeScore = ReadIntMap(GetObject(obj, "judgeScore")),
                Scoring = ReadScoring(GetObject(obj, "scoring"))
            };
        }

        private static PlayerData ReadPlayer(Dictionary<string, object> obj)
        {
            return new PlayerData { MaxHp = GetInt(obj, "maxHp") };
        }

        private static EnemyData ReadEnemy(Dictionary<string, object> obj)
        {
            return new EnemyData
            {
                Name = GetString(obj, "name"),
                AttackPower = GetDouble(obj, "attackPower"),
                Hp = GetDouble(obj, "hp")
            };
        }

        private static Dictionary<string, DifficultyData> ReadDifficultyMap(Dictionary<string, object> obj)
        {
            var map = new Dictionary<string, DifficultyData>();
            foreach (var key in BattleSimulator.Difficulties)
            {
                var difficulty = GetObject(obj, key);
                map[key] = new DifficultyData
                {
                    Id = GetString(difficulty, "id"),
                    Label = GetString(difficulty, "label"),
                    Loop1 = ReadLoop(GetObject(difficulty, "loop1")),
                    ChartSummary = ReadChartSummary(GetObject(difficulty, "chartSummary"))
                };
            }
            return map;
        }

        private static Dictionary<string, List<NoteData>> ReadCharts(Dictionary<string, object> obj)
        {
            var charts = new Dictionary<string, List<NoteData>>();
            foreach (var key in BattleSimulator.Difficulties)
            {
                var notes = new List<NoteData>();
                foreach (var item in GetList(obj, key))
                {
                    notes.Add(ReadNote(AsObject(item, key + " note")));
                }
                charts[key] = notes;
            }
            return charts;
        }

        private static NoteData ReadNote(Dictionary<string, object> obj)
        {
            return new NoteData
            {
                Id = GetString(obj, "id"),
                Type = GetString(obj, "type"),
                TimeMs = GetInt(obj, "timeMs"),
                DurationMs = GetInt(obj, "durationMs"),
                TargetCount = GetInt(obj, "targetCount"),
                PhraseLabel = GetString(obj, "phraseLabel"),
                CallText = GetString(obj, "callText"),
                ResponseText = GetString(obj, "responseText"),
                EnemyCue = GetBool(obj, "enemyCue"),
                PhraseRole = GetString(obj, "phraseRole"),
                PhraseStep = GetInt(obj, "phraseStep"),
                Finisher = GetBool(obj, "finisher")
            };
        }

        private static DifficultyLoopData ReadLoop(Dictionary<string, object> obj)
        {
            return new DifficultyLoopData
            {
                EnemyHpMultiplier = GetDouble(obj, "enemyHpMultiplier"),
                PlayerDamageMultiplier = GetDouble(obj, "playerDamageMultiplier"),
                EnemyAttackMultiplier = GetDouble(obj, "enemyAttackMultiplier")
            };
        }

        private static ChartSummaryData ReadChartSummary(Dictionary<string, object> obj)
        {
            return new ChartSummaryData
            {
                NoteCount = GetInt(obj, "noteCount"),
                TypeCounts = ReadTypeCounts(GetObject(obj, "typeCounts")),
                FirstMs = GetInt(obj, "firstMs"),
                LastEndMs = GetInt(obj, "lastEndMs")
            };
        }

        private static ScoringData ReadScoring(Dictionary<string, object> obj)
        {
            return new ScoringData
            {
                RankScoreThresholds = ReadIntMap(GetObject(obj, "rankScoreThresholds"))
            };
        }

        private static ExpectedTiming ReadExpectedTiming(Dictionary<string, object> obj)
        {
            return new ExpectedTiming
            {
                CountInMs = GetInt(obj, "countInMs"),
                FirstNoteBattleMs = GetInt(obj, "firstNoteBattleMs"),
                FirstNoteVirtualMs = GetInt(obj, "firstNoteVirtualMs"),
                WindowsMs = ReadWindows(GetObject(obj, "windowsMs")),
                InputGraceMs = GetInt(obj, "inputGraceMs"),
                MashInputGraceMs = GetInt(obj, "mashInputGraceMs"),
                MashDedupMinGapMs = GetInt(obj, "mashDedupMinGapMs")
            };
        }

        private static Dictionary<string, Dictionary<string, ExpectedRunResult>> ReadExpectedProfiles(Dictionary<string, object> obj)
        {
            var profiles = new Dictionary<string, Dictionary<string, ExpectedRunResult>>();
            foreach (var profile in BattleSimulator.Profiles)
            {
                var byDifficulty = new Dictionary<string, ExpectedRunResult>();
                var profileObj = GetObject(obj, profile);
                foreach (var difficulty in BattleSimulator.Difficulties)
                {
                    byDifficulty[difficulty] = ReadExpectedRun(GetObject(profileObj, difficulty));
                }
                profiles[profile] = byDifficulty;
            }
            return profiles;
        }

        private static ExpectedRunResult ReadExpectedRun(Dictionary<string, object> obj)
        {
            return new ExpectedRunResult
            {
                Clear = GetBool(obj, "clear"),
                Score = GetInt(obj, "score"),
                Rank = GetString(obj, "rank"),
                MaxCombo = GetInt(obj, "maxCombo"),
                Stats = ReadStats(GetObject(obj, "stats")),
                MissByType = ReadTypeCounts(GetObject(obj, "missByType")),
                Hp = ReadHp(GetObject(obj, "hp"))
            };
        }

        private static JudgeWindows ReadWindows(Dictionary<string, object> obj)
        {
            return new JudgeWindows
            {
                Perfect = GetInt(obj, "perfect"),
                Good = GetInt(obj, "good"),
                Bad = GetInt(obj, "bad")
            };
        }

        private static JudgeStats ReadStats(Dictionary<string, object> obj)
        {
            return new JudgeStats
            {
                Perfect = GetInt(obj, "perfect"),
                Good = GetInt(obj, "good"),
                Bad = GetInt(obj, "bad"),
                Miss = GetInt(obj, "miss")
            };
        }

        private static TypeCounts ReadTypeCounts(Dictionary<string, object> obj)
        {
            return new TypeCounts
            {
                Tap = GetInt(obj, "tap"),
                Hold = GetInt(obj, "hold"),
                Mash = GetInt(obj, "mash")
            };
        }

        private static HpResult ReadHp(Dictionary<string, object> obj)
        {
            return new HpResult
            {
                Remaining = GetInt(obj, "remaining"),
                Max = GetInt(obj, "max")
            };
        }

        private static Dictionary<string, int> ReadIntMap(Dictionary<string, object> obj)
        {
            var result = new Dictionary<string, int>();
            foreach (var pair in obj)
            {
                result[pair.Key] = ToInt(pair.Value, pair.Key);
            }
            return result;
        }

        private static List<string> ReadStringList(List<object> list)
        {
            var result = new List<string>();
            foreach (var item in list)
            {
                result.Add(Convert.ToString(item, CultureInfo.InvariantCulture));
            }
            return result;
        }

        private static Dictionary<string, object> GetObject(Dictionary<string, object> obj, string key)
        {
            return AsObject(GetRequired(obj, key), key);
        }

        private static List<object> GetList(Dictionary<string, object> obj, string key)
        {
            var value = GetRequired(obj, key) as List<object>;
            if (value == null)
            {
                throw new InvalidOperationException("Expected JSON array: " + key);
            }
            return value;
        }

        private static string GetString(Dictionary<string, object> obj, string key)
        {
            return Convert.ToString(GetRequired(obj, key), CultureInfo.InvariantCulture);
        }

        private static int GetInt(Dictionary<string, object> obj, string key)
        {
            return ToInt(GetRequired(obj, key), key);
        }

        private static double GetDouble(Dictionary<string, object> obj, string key)
        {
            return Convert.ToDouble(GetRequired(obj, key), CultureInfo.InvariantCulture);
        }

        private static bool GetBool(Dictionary<string, object> obj, string key)
        {
            return Convert.ToBoolean(GetRequired(obj, key), CultureInfo.InvariantCulture);
        }

        private static object GetRequired(Dictionary<string, object> obj, string key)
        {
            object value;
            if (!obj.TryGetValue(key, out value))
            {
                throw new InvalidOperationException("Missing JSON property: " + key);
            }
            return value;
        }

        private static int ToInt(object value, string label)
        {
            var number = Convert.ToDouble(value, CultureInfo.InvariantCulture);
            var rounded = Math.Round(number, MidpointRounding.AwayFromZero);
            if (Math.Abs(number - rounded) > 0.000001)
            {
                throw new InvalidOperationException("Expected integer value for " + label + " but got " + number);
            }
            return (int)rounded;
        }

        private static Dictionary<string, object> AsObject(object value, string label)
        {
            var obj = value as Dictionary<string, object>;
            if (obj == null)
            {
                throw new InvalidOperationException("Expected JSON object: " + label);
            }
            return obj;
        }

        private sealed class MiniJsonParser
        {
            private readonly string json;
            private int index;

            private MiniJsonParser(string json)
            {
                this.json = json;
            }

            public static object Parse(string json)
            {
                var parser = new MiniJsonParser(json);
                var value = parser.ParseValue();
                parser.SkipWhitespace();
                if (!parser.IsEnd)
                {
                    throw new InvalidOperationException("Unexpected trailing JSON at " + parser.index);
                }
                return value;
            }

            private bool IsEnd
            {
                get { return index >= json.Length; }
            }

            private object ParseValue()
            {
                SkipWhitespace();
                if (IsEnd) throw new InvalidOperationException("Unexpected end of JSON.");

                var current = json[index];
                if (current == '{') return ParseObject();
                if (current == '[') return ParseArray();
                if (current == '"') return ParseString();
                if (current == 't') return ParseLiteral("true", true);
                if (current == 'f') return ParseLiteral("false", false);
                if (current == 'n') return ParseLiteral("null", null);
                return ParseNumber();
            }

            private Dictionary<string, object> ParseObject()
            {
                var obj = new Dictionary<string, object>();
                Expect('{');
                SkipWhitespace();
                if (TryConsume('}')) return obj;

                while (true)
                {
                    var key = ParseString();
                    SkipWhitespace();
                    Expect(':');
                    obj[key] = ParseValue();
                    SkipWhitespace();
                    if (TryConsume('}')) return obj;
                    Expect(',');
                }
            }

            private List<object> ParseArray()
            {
                var list = new List<object>();
                Expect('[');
                SkipWhitespace();
                if (TryConsume(']')) return list;

                while (true)
                {
                    list.Add(ParseValue());
                    SkipWhitespace();
                    if (TryConsume(']')) return list;
                    Expect(',');
                }
            }

            private string ParseString()
            {
                var builder = new StringBuilder();
                Expect('"');

                while (!IsEnd)
                {
                    var current = json[index++];
                    if (current == '"') return builder.ToString();
                    if (current != '\\')
                    {
                        builder.Append(current);
                        continue;
                    }

                    if (IsEnd) throw new InvalidOperationException("Invalid JSON string escape.");
                    var escaped = json[index++];
                    if (escaped == '"' || escaped == '\\' || escaped == '/') builder.Append(escaped);
                    else if (escaped == 'b') builder.Append('\b');
                    else if (escaped == 'f') builder.Append('\f');
                    else if (escaped == 'n') builder.Append('\n');
                    else if (escaped == 'r') builder.Append('\r');
                    else if (escaped == 't') builder.Append('\t');
                    else if (escaped == 'u')
                    {
                        if (index + 4 > json.Length) throw new InvalidOperationException("Invalid unicode escape.");
                        var hex = json.Substring(index, 4);
                        builder.Append((char)int.Parse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                        index += 4;
                    }
                    else
                    {
                        throw new InvalidOperationException("Unsupported JSON escape: " + escaped);
                    }
                }

                throw new InvalidOperationException("Unterminated JSON string.");
            }

            private object ParseNumber()
            {
                var start = index;
                if (json[index] == '-') index += 1;
                while (!IsEnd && char.IsDigit(json[index])) index += 1;
                if (!IsEnd && json[index] == '.')
                {
                    index += 1;
                    while (!IsEnd && char.IsDigit(json[index])) index += 1;
                }
                if (!IsEnd && (json[index] == 'e' || json[index] == 'E'))
                {
                    index += 1;
                    if (!IsEnd && (json[index] == '+' || json[index] == '-')) index += 1;
                    while (!IsEnd && char.IsDigit(json[index])) index += 1;
                }

                var token = json.Substring(start, index - start);
                return double.Parse(token, NumberStyles.Float, CultureInfo.InvariantCulture);
            }

            private object ParseLiteral(string literal, object value)
            {
                if (index + literal.Length > json.Length ||
                    string.CompareOrdinal(json, index, literal, 0, literal.Length) != 0)
                {
                    throw new InvalidOperationException("Invalid JSON literal at " + index);
                }
                index += literal.Length;
                return value;
            }

            private void SkipWhitespace()
            {
                while (!IsEnd && char.IsWhiteSpace(json[index])) index += 1;
            }

            private bool TryConsume(char expected)
            {
                if (!IsEnd && json[index] == expected)
                {
                    index += 1;
                    return true;
                }
                return false;
            }

            private void Expect(char expected)
            {
                SkipWhitespace();
                if (IsEnd || json[index] != expected)
                {
                    throw new InvalidOperationException("Expected '" + expected + "' at " + index);
                }
                index += 1;
            }
        }
    }
}
