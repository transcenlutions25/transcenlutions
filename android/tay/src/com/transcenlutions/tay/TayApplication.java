package com.transcenlutions.tay;

import android.app.Application;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class TayApplication extends Application {
    // Single process-wide writer preserves edit order across Activity recreation.
    final ExecutorService draftIo = Executors.newSingleThreadExecutor();
    final ExecutorService networkIo = Executors.newSingleThreadExecutor();
    LocalDraftStore drafts;
    // Deliberately unavailable. Only a reviewed OAuth/native auth adapter may replace this seam.
    final AuthenticatedIdentityTransport.SessionProvider sessions = () -> null;
    @Override public void onCreate() { super.onCreate(); drafts = new LocalDraftStore(this); }
}
