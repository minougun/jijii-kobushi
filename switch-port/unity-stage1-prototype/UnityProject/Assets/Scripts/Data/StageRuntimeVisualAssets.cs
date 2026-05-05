namespace JijiiKobushi.Stage1Prototype
{
    public sealed class CharacterSpriteSpec
    {
        public CharacterSpriteSpec(string key, int index, int drawWidth, int drawHeight, int footInset)
        {
            Key = key;
            Index = index;
            DrawWidth = drawWidth;
            DrawHeight = drawHeight;
            FootInset = footInset;
        }

        public string Key { get; private set; }
        public int Index { get; private set; }
        public int DrawWidth { get; private set; }
        public int DrawHeight { get; private set; }
        public int FootInset { get; private set; }
    }

    public static class StageRuntimeVisualAssets
    {
        public const int ChibiSheetColumns = 5;
        public const int ChibiSheetRows = 2;

        public static string GetBackgroundAssetPath(string stageId)
        {
            if (!StagePackCatalog.ContainsStageId(stageId)) return "";
            return "./assets/images/stage-bg-" + stageId + "-v1.png";
        }

        public static string GetCharacterSheetAssetPath()
        {
            return "./assets/images/jii-kobushi-chibi-character-sheet-v1.png";
        }

        public static string GetOpeningStillAssetPath()
        {
            return "./assets/images/op-title-kakizome-hanshi-v1.png";
        }

        public static string GetSpecialCutinAssetPath()
        {
            return "./assets/images/kojiro-cutin.png";
        }

        public static string GetFinalRevealAssetPath()
        {
            return "./assets/images/hasegawa-reveal-sprite-v7.png";
        }

        public static bool TryGetChibiSpriteSpec(string key, out CharacterSpriteSpec spec)
        {
            spec = GetChibiSpriteSpec(key);
            return spec != null;
        }

        public static CharacterSpriteSpec GetChibiSpriteSpec(string key)
        {
            switch (key)
            {
                case "heroStage1": return new CharacterSpriteSpec(key, 0, 138, 176, 0);
                case "heroKimono": return new CharacterSpriteSpec(key, 1, 166, 176, 0);
                case "agent": return new CharacterSpriteSpec(key, 2, 134, 150, 0);
                case "bruiser": return new CharacterSpriteSpec(key, 3, 150, 158, 0);
                case "scientist": return new CharacterSpriteSpec(key, 4, 132, 156, 0);
                case "maskedHeavy": return new CharacterSpriteSpec(key, 5, 164, 174, 0);
                case "scout": return new CharacterSpriteSpec(key, 6, 134, 148, 0);
                case "elite": return new CharacterSpriteSpec(key, 7, 148, 164, 0);
                case "captain": return new CharacterSpriteSpec(key, 8, 150, 166, 0);
                case "steroidBoss": return new CharacterSpriteSpec(key, 9, 176, 184, 0);
                default: return null;
            }
        }
    }
}
