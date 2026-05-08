import UIKit
import WebKit

final class GameViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    private let resourceSchemeHandler = BundleResourceSchemeHandler()
    private let impactFeedback = UIImpactFeedbackGenerator(style: .light)
    private let selectionFeedback = UISelectionFeedbackGenerator()

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.984, green: 0.969, blue: 0.937, alpha: 1)
        configureWebView()
        loadBundledGame()
    }

    private func configureWebView() {
        let contentController = WKUserContentController()
        contentController.add(self, name: "jiiKobushiNative")
        contentController.addUserScript(WKUserScript(
            source: Self.nativeBridgeScript,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        ))

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.setURLSchemeHandler(resourceSchemeHandler, forURLScheme: "jiikobushi")

        if #available(iOS 14.0, *) {
            let pagePreferences = WKWebpagePreferences()
            pagePreferences.allowsContentJavaScript = true
            configuration.defaultWebpagePreferences = pagePreferences
        }

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false

        view.addSubview(webView)
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])

        self.webView = webView
        impactFeedback.prepare()
        selectionFeedback.prepare()
    }

    private func loadBundledGame() {
        guard Bundle.main.url(forResource: "index", withExtension: "html") != nil else {
            showLaunchError("同梱されたゲームファイルを見つけられません。Xcode の Copy Bundle Resources を確認してください。")
            return
        }

        webView.load(URLRequest(url: URL(string: "jiikobushi://local/index.html")!))
    }

    private func showLaunchError(_ message: String) {
        let label = UILabel()
        label.text = message
        label.textColor = .darkText
        label.font = .preferredFont(forTextStyle: .headline)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)

        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "jiiKobushiNative" else { return }

        if let body = message.body as? [String: Any], let type = body["type"] as? String {
            switch type {
            case "rhythmInput":
                impactFeedback.impactOccurred(intensity: 0.72)
                impactFeedback.prepare()
            case "uiSelect":
                selectionFeedback.selectionChanged()
                selectionFeedback.prepare()
            default:
                break
            }
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showLaunchError("ゲームの読み込みに失敗しました: \(error.localizedDescription)")
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showLaunchError("ゲームの読み込みに失敗しました: \(error.localizedDescription)")
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let scheme = navigationAction.request.url?.scheme else {
            decisionHandler(.cancel)
            return
        }

        decisionHandler(scheme == "jiikobushi" ? .allow : .cancel)
    }

    private static let nativeBridgeScript = """
    (() => {
      const post = (type) => {
        try {
          window.webkit?.messageHandlers?.jiiKobushiNative?.postMessage({ type });
        } catch (_) {}
      };

      document.documentElement.classList.add('native-ios');

      document.addEventListener('pointerdown', (event) => {
        if (event.target?.closest?.('#mobileTapPad')) {
          post('rhythmInput');
          return;
        }
        if (event.target?.closest?.('button, summary, input, [role="radio"]')) {
          post('uiSelect');
        }
      }, { capture: true, passive: true });
    })();
    """
}
