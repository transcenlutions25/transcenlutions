import com.sun.source.util.JavacTask;
import javax.tools.*;
import java.util.*;

/** Syntax check only: intentionally does not impersonate an Android SDK compilation. */
public final class ParseJavaSources {
    public static void main(String[] args) throws Exception {
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) throw new IllegalStateException("JDK compiler module is required");
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        try (StandardJavaFileManager files = compiler.getStandardFileManager(diagnostics, null, null)) {
            JavacTask task = (JavacTask) compiler.getTask(null, files, diagnostics,
                Arrays.asList("-source", "8", "-proc:none"), null, files.getJavaFileObjects(args));
            task.parse();
            for (Diagnostic<?> diagnostic : diagnostics.getDiagnostics()) {
                if (diagnostic.getKind() == Diagnostic.Kind.ERROR) throw new AssertionError(diagnostic.toString());
            }
        }
        System.out.println("Java syntax parsed: " + args.length + " source files; Android API/type validation is NOT performed");
    }
}
