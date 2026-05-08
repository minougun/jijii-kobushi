import Foundation
import WebKit

final class BundleResourceSchemeHandler: NSObject, WKURLSchemeHandler {
    private let resourceRoot: URL

    init(resourceRoot: URL = Bundle.main.resourceURL ?? Bundle.main.bundleURL) {
        self.resourceRoot = resourceRoot.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            fail(urlSchemeTask, code: NSURLErrorBadURL)
            return
        }

        guard let relativePath = sanitizedRelativePath(from: requestURL) else {
            fail(urlSchemeTask, code: NSURLErrorNoPermissionsToReadFile)
            return
        }
        let fileURL = resourceRoot.appendingPathComponent(relativePath).standardizedFileURL

        guard
            fileURL.path == resourceRoot.appendingPathComponent(relativePath).standardizedFileURL.path,
            fileURL.path.hasPrefix(resourceRoot.path + "/"),
            FileManager.default.fileExists(atPath: fileURL.path)
        else {
            fail(urlSchemeTask, code: NSURLErrorFileDoesNotExist)
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let response = URLResponse(
                url: requestURL,
                mimeType: mimeType(for: fileURL.pathExtension),
                expectedContentLength: data.count,
                textEncodingName: "utf-8"
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
    }

    private func sanitizedRelativePath(from url: URL) -> String? {
        let rawPath = url.path.removingPercentEncoding ?? url.path
        let trimmed = rawPath.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let relativePath = trimmed.isEmpty ? "index.html" : trimmed
        let allowed = relativePath == "index.html" || relativePath.hasPrefix("src/") || relativePath.hasPrefix("assets/")
        return allowed && !relativePath.contains("..") ? relativePath : nil
    }

    private func fail(_ urlSchemeTask: WKURLSchemeTask, code: Int) {
        let error = NSError(domain: NSURLErrorDomain, code: code)
        urlSchemeTask.didFailWithError(error)
    }

    private func mimeType(for pathExtension: String) -> String {
        switch pathExtension.lowercased() {
        case "html":
            return "text/html"
        case "css":
            return "text/css"
        case "js", "mjs":
            return "text/javascript"
        case "json":
            return "application/json"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "webp":
            return "image/webp"
        case "svg":
            return "image/svg+xml"
        case "mp3":
            return "audio/mpeg"
        case "mp4":
            return "video/mp4"
        case "woff2":
            return "font/woff2"
        case "ttf":
            return "font/ttf"
        default:
            return "application/octet-stream"
        }
    }
}
