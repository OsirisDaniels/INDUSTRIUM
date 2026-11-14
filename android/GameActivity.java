package nz.industrium.game;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;

public final class GameActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView game;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(0xff101d24);
        layout.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        game = new WebView(this);
        game.setBackgroundColor(0xff101d24);
        game.getSettings().setJavaScriptEnabled(true);
        game.getSettings().setDomStorageEnabled(true);
        game.getSettings().setAllowFileAccess(false);
        game.getSettings().setAllowContentAccess(false);
        game.setWebChromeClient(new android.webkit.WebChromeClient());
        game.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isGameResource(request);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!isGameResource(request)) return missing();
                String path = request.getUrl().getPath();
                if (path == null || path.contains("..") || path.indexOf('\\') >= 0) return missing();
                try {
                    String mime = path.endsWith(".js") ? "text/javascript" :
                            path.endsWith(".css") ? "text/css" : "text/html";
                    return new WebResourceResponse(mime, "UTF-8", getAssets().open(path.substring(1)));
                } catch (IOException error) {
                    return missing();
                }
            }
        });
        layout.addView(game, new FrameLayout.LayoutParams(-1, -1));
        setContentView(layout);
        layout.requestApplyInsets();
        game.loadUrl("https://" + HOST + "/engine/index.html");
    }

    private static boolean isGameResource(WebResourceRequest request) {
        return "https".equals(request.getUrl().getScheme()) && HOST.equals(request.getUrl().getHost());
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }

    @Override
    protected void onPause() {
        game.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))", null);
        super.onPause();
    }
}
