#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace JijiiKobushi.Stage1Prototype.EditorTools
{
    public static class Stage1PrototypeSceneSetup
    {
        private const string ScenePath = "Assets/Scenes/Stage1Prototype.unity";

        [MenuItem("Jijii Kobushi/Setup Stage 1 Prototype Scene")]
        public static void EnsureSceneVisible()
        {
            var scene = EditorSceneManager.OpenScene(ScenePath, OpenSceneMode.Single);

            EnsureRunner();
            EnsureCamera();
            EnsureLight();
            EnsureMarkerCube("Stage Board - visible placeholder", new Vector3(0f, -0.15f, 0f), new Vector3(8f, 0.18f, 4.5f), new Color(0.86f, 0.78f, 0.58f));
            EnsureMarkerCube("Gold Hit Line - visual marker", new Vector3(-2.4f, 0.08f, -1.35f), new Vector3(0.12f, 0.28f, 2.4f), new Color(0.95f, 0.72f, 0.1f));
            EnsureMarkerCube("Tap Note Marker", new Vector3(0.3f, 0.1f, -1.35f), new Vector3(0.48f, 0.32f, 0.48f), new Color(0.09f, 0.42f, 0.88f));
            EnsureMarkerCube("Hold Note Marker", new Vector3(1.2f, 0.1f, -1.35f), new Vector3(1.2f, 0.32f, 0.48f), new Color(0.55f, 0.28f, 0.86f));
            EnsureMarkerCube("Mash Note Marker", new Vector3(2.5f, 0.1f, -1.35f), new Vector3(0.8f, 0.32f, 0.48f), new Color(0.87f, 0.21f, 0.18f));

            EditorSceneManager.MarkSceneDirty(scene);
            EditorSceneManager.SaveScene(scene);
        }

        private static void EnsureRunner()
        {
            var runner = GameObject.Find("Stage1PlaceholderRunner");
            if (runner == null)
            {
                runner = new GameObject("Stage1PlaceholderRunner");
            }

            var behaviour = runner.GetComponent<PlaceholderRendererBehaviour>();
            if (behaviour == null)
            {
                behaviour = runner.AddComponent<PlaceholderRendererBehaviour>();
            }

            var serialized = new SerializedObject(behaviour);
            serialized.FindProperty("difficulty").stringValue = "normal";
            serialized.FindProperty("playbackSpeed").floatValue = 1f;
            serialized.FindProperty("useAudioClock").boolValue = true;
            serialized.FindProperty("stageNumber").intValue = 1;
            serialized.ApplyModifiedPropertiesWithoutUndo();
        }

        private static void EnsureCamera()
        {
            var cameraObject = GameObject.Find("Main Camera");
            if (cameraObject == null)
            {
                cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                cameraObject.AddComponent<Camera>();
                cameraObject.AddComponent<AudioListener>();
            }

            cameraObject.transform.position = new Vector3(0f, 5.2f, -7.2f);
            cameraObject.transform.rotation = Quaternion.Euler(58f, 0f, 0f);

            var camera = cameraObject.GetComponent<Camera>();
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = new Color(0.07f, 0.07f, 0.08f);
            camera.fieldOfView = 45f;
            camera.nearClipPlane = 0.1f;
            camera.farClipPlane = 100f;
        }

        private static void EnsureLight()
        {
            var lightObject = GameObject.Find("Directional Light");
            if (lightObject == null)
            {
                lightObject = new GameObject("Directional Light");
                lightObject.AddComponent<Light>();
            }

            lightObject.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            var light = lightObject.GetComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.15f;
        }

        private static void EnsureMarkerCube(string name, Vector3 position, Vector3 scale, Color color)
        {
            var marker = GameObject.Find(name);
            if (marker == null)
            {
                marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
                marker.name = name;
            }

            marker.transform.position = position;
            marker.transform.localScale = scale;

            var renderer = marker.GetComponent<Renderer>();
            if (renderer.sharedMaterial == null || renderer.sharedMaterial.name != name + " Material")
            {
                renderer.sharedMaterial = new Material(Shader.Find("Standard"))
                {
                    name = name + " Material"
                };
            }

            renderer.sharedMaterial.color = color;
        }
    }
}
#endif
