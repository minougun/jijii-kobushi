#if UNITY_5_3_OR_NEWER
using System;
using System.IO;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype
{
    public static class PrototypeTextureLoader
    {
        public static bool TryLoadRgbaTexture(string filePath, string label, out Texture2D texture, out string status)
        {
            texture = null;
            try
            {
                var bytes = File.ReadAllBytes(filePath);
                var loaded = new Texture2D(2, 2, TextureFormat.RGBA32, false);
                if (!ImageConversion.LoadImage(loaded, bytes))
                {
                    status = label + " decode failed";
                    return false;
                }

                texture = loaded;
                status = label + " loaded";
                return true;
            }
            catch (Exception ex)
            {
                status = label + " load failed: " + ex.Message;
                return false;
            }
        }
    }
}
#endif
