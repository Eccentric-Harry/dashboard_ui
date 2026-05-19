import { useEffect, useState, useRef } from 'react'
import { Terminal, RefreshCw, EyeOff, Eye, CheckCircle2, ShieldAlert, Cpu, Database, Network } from 'lucide-react'
import './server-cold-start-console.css'

interface LogLine {
  text: string;
  type: 'render' | 'docker' | 'maven' | 'spring' | 'system' | 'live';
  delay: number;
  isVerbose?: boolean;
}

// Complete log items matching Render's logs from the user prompt
const SIMULATED_LOGS: LogLine[] = [
  { text: '==> Downloading cache...', type: 'render', delay: 800 },
  { text: '==> Cloning from https://github.com/Eccentric-Harry/dashboard_backend', type: 'render', delay: 1000 },
  { text: '==> Checking out commit f7bac50814309f6650ed7bc3f6c226c04781d7d8 in branch release-1.0.0', type: 'render', delay: 1200 },
  { text: '==> Downloaded 575MB in 2s. Extraction took 4s.', type: 'render', delay: 1200 },
  { text: '#1 [internal] load build definition from Dockerfile', type: 'docker', delay: 500 },
  { text: '#1 transferring dockerfile:', type: 'docker', delay: 250 },
  { text: '#1 transferring dockerfile: 738B done', type: 'docker', delay: 200 },
  { text: '#1 DONE 0.8s', type: 'docker', delay: 400 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#2 [internal] load metadata for docker.io/library/eclipse-temurin:21-jre-jammy', type: 'docker', delay: 600 },
  { text: '#2 ...', type: 'docker', delay: 300, isVerbose: true },
  { text: '', type: 'docker', delay: 150, isVerbose: true },
  { text: '#3 [auth] library/eclipse-temurin:pull render-prod/docker-mirror-repository/library/eclipse-temurin:pull token for us-west1-docker.pkg.dev', type: 'docker', delay: 400, isVerbose: true },
  { text: '#3 DONE 0.0s', type: 'docker', delay: 300, isVerbose: true },
  { text: '', type: 'docker', delay: 150, isVerbose: true },
  { text: '#4 [internal] load metadata for docker.io/library/eclipse-temurin:21-jdk-jammy', type: 'docker', delay: 800 },
  { text: '#4 DONE 6.4s', type: 'docker', delay: 400 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#2 [internal] load metadata for docker.io/library/eclipse-temurin:21-jre-jammy', type: 'docker', delay: 300, isVerbose: true },
  { text: '#2 DONE 6.4s', type: 'docker', delay: 300, isVerbose: true },
  { text: '', type: 'docker', delay: 150, isVerbose: true },
  { text: '#5 [internal] load .dockerignore', type: 'docker', delay: 200 },
  { text: '#5 transferring context: 88B done', type: 'docker', delay: 200 },
  { text: '#5 DONE 0.1s', type: 'docker', delay: 300 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#6 [internal] load build context', type: 'docker', delay: 200, isVerbose: true },
  { text: '#6 DONE 0.0s', type: 'docker', delay: 200, isVerbose: true },
  { text: '', type: 'docker', delay: 150, isVerbose: true },
  { text: '#7 importing cache manifest from local:16644428285454752304', type: 'docker', delay: 400, isVerbose: true },
  { text: '#7 inferred cache manifest type: application/vnd.oci.image.manifest.v1+json done', type: 'docker', delay: 300, isVerbose: true },
  { text: '#7 DONE 0.0s', type: 'docker', delay: 300, isVerbose: true },
  { text: '', type: 'docker', delay: 150, isVerbose: true },
  { text: '#8 [build 1/8] FROM docker.io/library/eclipse-temurin:21-jdk-jammy@sha256:801b7e1a9c4befaf82bf9a2a58025ef43a7694bbc84779187ad0524d84742772', type: 'docker', delay: 500, isVerbose: true },
  { text: '#8 resolve docker.io/library/eclipse-temurin:21-jdk-jammy@sha256:801b7e1a9c4befaf82bf9a2a58025ef43a7694bbc84779187ad0524d84742772 0.1s done', type: 'docker', delay: 300, isVerbose: true },
  { text: '#8 DONE 0.1s', type: 'docker', delay: 300 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#9 [stage-1 1/3] FROM docker.io/library/eclipse-temurin:21-jre-jammy@sha256:199aebeb3adcde4910695cdebfe782ada38dadb6cc8013159b58d3724451befd', type: 'docker', delay: 500, isVerbose: true },
  { text: '#9 resolve docker.io/library/eclipse-temurin:21-jre-jammy@sha256:199aebeb3adcde4910695cdebfe782ada38dadb6cc8013159b58d3724451befd', type: 'docker', delay: 300, isVerbose: true },
  { text: '#9 resolve docker.io/library/eclipse-temurin:21-jre-jammy@sha256:199aebeb3adcde4910695cdebfe782ada38dadb6cc8013159b58d3724451befd 0.1s done', type: 'docker', delay: 300, isVerbose: true },
  { text: '#9 DONE 0.1s', type: 'docker', delay: 300 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#6 [internal] load build context', type: 'docker', delay: 200, isVerbose: true },
  { text: '#6 transferring context: 187.73kB 0.0s done', type: 'docker', delay: 300, isVerbose: true },
  { text: '#6 DONE 0.1s', type: 'docker', delay: 200, isVerbose: true },
  { text: '', type: 'docker', delay: 150, isVerbose: true },
  { text: '#10 [build 2/8] WORKDIR /app', type: 'docker', delay: 300 },
  { text: '#10 CACHED', type: 'docker', delay: 200 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#11 [build 3/8] COPY mvnw .', type: 'docker', delay: 300 },
  { text: '#11 CACHED', type: 'docker', delay: 200 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#12 [build 4/8] COPY .mvn .mvn', type: 'docker', delay: 300 },
  { text: '#12 CACHED', type: 'docker', delay: 200 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#13 [build 5/8] COPY pom.xml .', type: 'docker', delay: 300 },
  { text: '#13 CACHED', type: 'docker', delay: 200 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#14 [build 6/8] RUN ./mvnw dependency:go-offline', type: 'docker', delay: 600 },
  { text: '#14 sha256:40d16f30db405106ef8074779bdf41f012465c2a785bbeaa2eab9f2081099b47 27.26MB / 29.74MB 0.2s', type: 'docker', delay: 250, isVerbose: true },
  { text: '#14 sha256:40d16f30db405106ef8074779bdf41f012465c2a785bbeaa2eab9f2081099b47 29.74MB / 29.74MB 0.3s', type: 'docker', delay: 250, isVerbose: true },
  { text: '#14 sha256:40d16f30db405106ef8074779bdf41f012465c2a785bbeaa2eab9f2081099b47 29.74MB / 29.74MB 0.4s done', type: 'docker', delay: 300, isVerbose: true },
  { text: '#14 extracting sha256:40d16f30db405106ef8074779bdf41f012465c2a785bbeaa2eab9f2081099b47', type: 'docker', delay: 300, isVerbose: true },
  { text: '#14 extracting sha256:40d16f30db405106ef8074779bdf41f012465c2a785bbeaa2eab9f2081099b47 1.6s done', type: 'docker', delay: 300 },
  { text: '#14 sha256:bac0cedbe7243c29e62f2edc257a1b63f1b14230678962e5eaa67199274ff4bc 20.70MB / 20.70MB 0.2s', type: 'docker', delay: 200, isVerbose: true },
  { text: '#14 sha256:6525f2e444f155b1052b82e6b57e2c0fd233969b0a16f8e9844714f79c640b64 158.17MB / 158.17MB 2.8s done', type: 'docker', delay: 400, isVerbose: true },
  { text: '#14 extracting sha256:6525f2e444f155b1052b82e6b57e2c0fd233969b0a16f8e9844714f79c640b64', type: 'docker', delay: 400, isVerbose: true },
  { text: '#14 extracting sha256:6525f2e444f155b1052b82e6b57e2c0fd233969b0a16f8e9844714f79c640b64 10.9s done', type: 'docker', delay: 500 },
  { text: '#14 DONE 15.0s', type: 'docker', delay: 600 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#15 [build 7/8] COPY src src', type: 'docker', delay: 400 },
  { text: '#15 DONE 0.1s', type: 'docker', delay: 300 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#16 [build 8/8] RUN ./mvnw package -DskipTests', type: 'docker', delay: 600 },
  { text: '#16 2.685 [INFO] Scanning for projects...', type: 'maven', delay: 500 },
  { text: '#16 2.953 [INFO] -------------------< com.personal-dashboard:backend >-------------------', type: 'maven', delay: 300 },
  { text: '#16 2.953 [INFO] Building  0.0.1-SNAPSHOT', type: 'maven', delay: 350 },
  { text: '#16 2.953 [INFO]   from pom.xml', type: 'maven', delay: 200 },
  { text: '#16 2.953 [INFO] --------------------------------[ jar ]---------------------------------', type: 'maven', delay: 300 },
  { text: '#16 3.842 [INFO] --- resources:3.3.1:resources (default-resources) @ backend ---', type: 'maven', delay: 400 },
  { text: '#16 4.062 [INFO] Copying 1 resource from src/main/resources to target/classes', type: 'maven', delay: 400 },
  { text: '#16 4.079 [INFO] --- compiler:3.14.1:compile (default-compile) @ backend ---', type: 'maven', delay: 500 },
  { text: '#16 4.260 [INFO] Recompiling the module because of changed source code.', type: 'maven', delay: 400 },
  { text: '#16 4.270 [INFO] Compiling 70 source files with javac [debug parameters release 21] to target/classes', type: 'maven', delay: 2500 },
  { text: '#16 12.75 [INFO] --- surefire:3.5.5:test (default-test) @ backend ---', type: 'maven', delay: 500 },
  { text: '#16 12.93 [INFO] Tests are skipped.', type: 'maven', delay: 350 },
  { text: '#16 13.51 [INFO] Building jar: /app/target/backend-0.0.1-SNAPSHOT.jar', type: 'maven', delay: 600 },
  { text: '#16 13.63 [INFO] --- spring-boot:4.0.5:repackage (repackage) @ backend ---', type: 'maven', delay: 500 },
  { text: '#16 14.79 [INFO] Replacing main artifact /app/target/backend-0.0.1-SNAPSHOT.jar with repackaged archive', type: 'maven', delay: 400 },
  { text: '#16 14.79 [INFO] ------------------------------------------------------------------------', type: 'maven', delay: 200 },
  { text: '#16 14.79 [INFO] BUILD SUCCESS', type: 'maven', delay: 500 },
  { text: '#16 14.79 [INFO] Total time:  12.123 s', type: 'maven', delay: 400 },
  { text: '#16 DONE 15.0s', type: 'docker', delay: 500 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#17 [stage-1 2/3] WORKDIR /app', type: 'docker', delay: 350 },
  { text: '#17 DONE 0.3s', type: 'docker', delay: 300 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#18 [stage-1 3/3] COPY --from=build /app/target/*.jar app.jar', type: 'docker', delay: 400 },
  { text: '#18 DONE 0.3s', type: 'docker', delay: 300 },
  { text: '', type: 'docker', delay: 150 },
  { text: '#19 exporting to image', type: 'docker', delay: 500 },
  { text: '#19 exporting layers', type: 'docker', delay: 300, isVerbose: true },
  { text: '#19 exporting layers 0.6s done', type: 'docker', delay: 300 },
  { text: '#19 pushing layers', type: 'docker', delay: 500 },
  { text: '#19 pushing manifest for image-registry-v2.aws-ap-southeast-1-1.internal.render.com/srv-d84so6f7f7vs73fti3s0:bld-d85jb3favr4c73c771t0', type: 'docker', delay: 600 },
  { text: '#19 DONE 2.9s', type: 'docker', delay: 500 },
  { text: '', type: 'docker', delay: 150 },
  { text: '==> Deploying...', type: 'render', delay: 800 },
  { text: '==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance', type: 'render', delay: 1000 },
  { text: '', type: 'render', delay: 150 },
  { text: '  .   ____          _            __ _ _', type: 'spring', delay: 70 },
  { text: ' /\\\\ / ___\'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\', type: 'spring', delay: 70 },
  { text: '( ( )\\___ | \'_ | \'_| | \'_ \\/ _` | \\ \\ \\ \\', type: 'spring', delay: 70 },
  { text: ' \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )', type: 'spring', delay: 70 },
  { text: '  \'  |____| .__|_| |_|_| |_\\__, | / / / /', type: 'spring', delay: 70 },
  { text: ' =========|_|==============|___/=/_/_/_/', type: 'spring', delay: 70 },
  { text: ' :: Spring Boot ::                (v4.0.5)', type: 'spring', delay: 500 },
  { text: '', type: 'spring', delay: 150 },
  { text: 'INFO 1 --- [backend] [           main] c.p.backend.DashboardApplication         : Starting DashboardApplication v0.0.1-SNAPSHOT using Java 21.0.11 with PID 1', type: 'spring', delay: 600 },
  { text: 'INFO 1 --- [backend] [           main] c.p.backend.DashboardApplication         : The following 1 profile is active: "local"', type: 'spring', delay: 600 },
  { text: 'INFO 1 --- [backend] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Bootstrapping Spring Data MongoDB repositories in DEFAULT mode.', type: 'spring', delay: 800 },
  { text: 'INFO 1 --- [backend] [           main] .s.d.r.c.RepositoryConfigurationDelegate : Finished Spring Data repository scanning in 996 ms. Found 9 MongoDB repository interfaces.', type: 'spring', delay: 800 },
  { text: 'INFO 1 --- [backend] [           main] o.s.boot.tomcat.TomcatWebServer          : Tomcat initialized with port 8080 (http)', type: 'spring', delay: 600 },
  { text: 'INFO 1 --- [backend] [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [           main] o.apache.catalina.core.StandardEngine    : Starting Servlet engine: [Apache Tomcat/11.0.20]', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [           main] b.w.c.s.WebApplicationContextInitializer : Root WebApplicationContext: initialization completed in 34903 ms', type: 'spring', delay: 1000 },
  { text: '==> No open ports detected, continuing to scan...', type: 'render', delay: 1500 },
  { text: '==> Docs on specifying a port: https://render.com/docs/web-services#port-binding', type: 'render', delay: 1000 },
  { text: 'INFO 1 --- [backend] [ofj.mongodb.net] org.mongodb.driver.cluster               : Adding discovered server ac-umsajfw-shard-00-02.5imoofj.mongodb.net:27017 to client view of cluster', type: 'spring', delay: 800 },
  { text: 'INFO 1 --- [backend] [ofj.mongodb.net] org.mongodb.driver.cluster               : Adding discovered server ac-umsajfw-shard-00-00.5imoofj.mongodb.net:27017 to client view of cluster', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [ofj.mongodb.net] org.mongodb.driver.cluster               : Adding discovered server ac-umsajfw-shard-00-01.5imoofj.mongodb.net:27017 to client view of cluster', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [ngodb.net:27017] org.mongodb.driver.cluster               : Monitor thread successfully connected to server with description ac-umsajfw-shard-00-00', type: 'spring', delay: 800 },
  { text: 'INFO 1 --- [backend] [ngodb.net:27017] org.mongodb.driver.cluster               : Monitor thread successfully connected to server with description ac-umsajfw-shard-00-01', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [ngodb.net:27017] org.mongodb.driver.cluster               : Monitor thread successfully connected to server with description ac-umsajfw-shard-00-02', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [           main] o.s.b.a.e.web.EndpointLinksResolver      : Exposing 3 endpoints beneath base path \'/actuator\'', type: 'spring', delay: 800 },
  { text: 'INFO 1 --- [backend] [           main] o.s.boot.tomcat.TomcatWebServer          : Tomcat started on port 8080 (http) with context path \'/\'', type: 'spring', delay: 600 },
  { text: 'INFO 1 --- [backend] [           main] c.p.backend.DashboardApplication         : Started DashboardApplication in 90.497 seconds', type: 'spring', delay: 700 },
  { text: 'INFO 1 --- [backend] [nio-8080-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/]       : Initializing Spring DispatcherServlet \'dispatcherServlet\'', type: 'spring', delay: 600 },
  { text: 'INFO 1 --- [backend] [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Initializing Servlet \'dispatcherServlet\'', type: 'spring', delay: 400 },
  { text: 'INFO 1 --- [backend] [nio-8080-exec-1] o.s.web.servlet.DispatcherServlet        : Completed initialization in 6 ms', type: 'spring', delay: 400 }
];

const SUCCESS_LOGS: LogLine[] = [
  { text: '==> Your service is live 🎉', type: 'live', delay: 500 },
  { text: '', type: 'live', delay: 150 },
  { text: '==> ///////////////////////////////////////////////////////////', type: 'live', delay: 200 },
  { text: '', type: 'live', delay: 100 },
  { text: '==> Available at your primary URL https://dashboard-backend-utqx.onrender.com', type: 'live', delay: 400 },
  { text: '', type: 'live', delay: 100 },
  { text: '==> ///////////////////////////////////////////////////////////', type: 'live', delay: 200 }
];

interface ServerColdStartConsoleProps {
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function ServerColdStartConsole({ isLoading, error, refetch }: ServerColdStartConsoleProps) {
  const [shouldShow, setShouldShow] = useState(false)
  const [isRendered, setIsRendered] = useState(false)
  
  // Console logging state
  const [logs, setLogs] = useState<{ text: string; type: LogLine['type']; timestamp: string }[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVerbose, setIsVerbose] = useState(false)
  const [isFastForward, setIsFastForward] = useState(false)
  const [completedBuild, setCompletedBuild] = useState(false)
  
  // Stats
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [stage, setStage] = useState<'cloning' | 'docker' | 'maven' | 'spring' | 'live'>('cloning')
  
  const terminalEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const logTimeoutRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const loadingStartRef = useRef<number | null>(null)

  // Refs to maintain state values inside the animation timeout without re-triggering the useEffect
  const currentIndexRef = useRef(0)
  const isVerboseRef = useRef(isVerbose)
  const isFastForwardRef = useRef(isFastForward)
  const isLoadingRef = useRef(isLoading)
  const completedBuildRef = useRef(completedBuild)
  const errorRef = useRef(error)

  useEffect(() => {
    isVerboseRef.current = isVerbose
  }, [isVerbose])

  useEffect(() => {
    isFastForwardRef.current = isFastForward
  }, [isFastForward])

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    completedBuildRef.current = completedBuild
  }, [completedBuild])

  useEffect(() => {
    errorRef.current = error
  }, [error])

  // 1. Detect if server requests take > 1500ms to show the terminal
  useEffect(() => {
    if (isLoading) {
      loadingStartRef.current = Date.now()
      const timer = window.setTimeout(() => {
        setShouldShow(true)
        setIsRendered(true)
        startTimeRef.current = Date.now()
      }, 1500)
      
      return () => {
        window.clearTimeout(timer)
      }
    } else {
      // If load finished and we are currently showing, start transition out
      if (shouldShow) {
        setIsFastForward(true)
      } else {
        setIsRendered(false)
      }
    }
  }, [isLoading, shouldShow])

  // 2. Dynamic elapsed timer
  useEffect(() => {
    if (isRendered && !completedBuild && !error) {
      timerRef.current = window.setInterval(() => {
        setSecondsElapsed(prev => prev + 1)
      }, 1000)
    }
    
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
      }
    }
  }, [isRendered, completedBuild, error])

  // Helper to format ISO dynamic timestamps matching the real logs style in local device time
  const getDynamicTimestamp = () => {
    const now = new Date()
    const tzoffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(now.getTime() - tzoffset).toISOString()
    return localISOTime
  }

  // 3. Main logs animation loop (robustly scheduled and timed)
  useEffect(() => {
    if (!isRendered) {
      // Reset state if closed
      currentIndexRef.current = 0
      isFastForwardRef.current = false
      completedBuildRef.current = false
      setCurrentIndex(0)
      setLogs([])
      setStage('cloning')
      setCompletedBuild(false)
      setIsFastForward(false)
      setSecondsElapsed(0)
      return
    }

    if (error || completedBuild) return

    let successTimeoutRef: number | null = null

    const playSuccessLogs = (successIdx = 0) => {
      if (successIdx >= SUCCESS_LOGS.length) {
        setCompletedBuild(true)
        setStage('live')
        return
      }
      
      const line = SUCCESS_LOGS[successIdx]
      setLogs(prev => [
        ...prev,
        {
          text: line.text,
          type: 'live',
          timestamp: getDynamicTimestamp()
        }
      ])
      
      successTimeoutRef = window.setTimeout(() => playSuccessLogs(successIdx + 1), 150)
    }

    const playNextLog = () => {
      if (errorRef.current || completedBuildRef.current) return

      const idx = currentIndexRef.current

      // If we are finished with standard logs
      if (idx >= SIMULATED_LOGS.length) {
        if (isFastForwardRef.current) {
          playSuccessLogs()
        } else if (isLoadingRef.current) {
          // Just print periodic heartbeat logs if the server is still sleeping
          logTimeoutRef.current = window.setTimeout(() => {
            setLogs(prev => [
              ...prev, 
              { 
                text: '==> No open ports detected, continuing to scan...', 
                type: 'render', 
                timestamp: getDynamicTimestamp() 
              }
            ])
            playNextLog()
          }, 4500)
        }
        return
      }

      const nextLine = SIMULATED_LOGS[idx]

      // Filter out verbose messages if standard logs selected
      if (!isVerboseRef.current && nextLine.isVerbose) {
        currentIndexRef.current = idx + 1
        setCurrentIndex(idx + 1)
        playNextLog()
        return
      }

      // Determine current stage for UX indicators
      if (nextLine.type === 'render') {
        if (nextLine.text.includes('Deploying')) {
          setStage('spring')
        } else {
          setStage('cloning')
        }
      } else if (nextLine.type === 'docker') {
        setStage('docker')
      } else if (nextLine.type === 'maven') {
        setStage('maven')
      } else if (nextLine.type === 'spring') {
        setStage('spring')
      }

      // Add log
      setLogs(prev => [
        ...prev,
        {
          text: nextLine.text,
          type: nextLine.type,
          timestamp: getDynamicTimestamp()
        }
      ])

      // Calculate next delay: speed up to 35ms if fast forwarding.
      // We scale the normal delay by 3.0x to stretch the logs line-by-line flow to at least 2:15 minutes (~141.5 seconds).
      const activeDelay = isFastForwardRef.current ? 35 : nextLine.delay * 3.0

      currentIndexRef.current = idx + 1
      setCurrentIndex(idx + 1)
      logTimeoutRef.current = window.setTimeout(playNextLog, activeDelay)
    }

    // Start the loop!
    if (currentIndexRef.current >= SIMULATED_LOGS.length && isFastForwardRef.current) {
      playSuccessLogs()
    } else {
      playNextLog()
    }

    return () => {
      if (logTimeoutRef.current) {
        window.clearTimeout(logTimeoutRef.current)
      }
      if (successTimeoutRef) {
        window.clearTimeout(successTimeoutRef)
      }
    }
  }, [isRendered, isFastForward, isVerbose, error, completedBuild])

  // 4. Handle auto-closing transition when completedBuild becomes true
  useEffect(() => {
    if (completedBuild) {
      const timer1 = window.setTimeout(() => {
        setShouldShow(false)
        const timer2 = window.setTimeout(() => {
          setIsRendered(false)
        }, 500)
        return () => window.clearTimeout(timer2)
      }, 2200)

      return () => window.clearTimeout(timer1)
    }
  }, [completedBuild])

  // 5. Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  if (!isRendered) return null

  // Calculate dynamic build progress percentage
  const getProgressPercentage = () => {
    if (completedBuild) return 100
    if (currentIndex === 0) return 3
    const ratio = currentIndex / SIMULATED_LOGS.length
    return Math.min(Math.round(ratio * 92), 92)
  }

  // Format MM:SS elapsed time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Check custom text features to apply aesthetic CSS
  const getLogContentClass = (text: string, type: LogLine['type']) => {
    if (type === 'live' || text.includes('Your service is live') || text.includes('Available at your primary URL')) {
      return 'warmup-log-content success-alert'
    }
    if (text.startsWith('==>') || text.includes('Setting WEB_CONCURRENCY')) {
      return 'warmup-log-content system-alert'
    }
    if (text.includes('CACHED')) {
      return 'warmup-log-content docker-cached'
    }
    if (text.includes('Spring Boot') || text.includes(':: Spring Boot ::') || text.includes('/\\\\ / ___')) {
      return 'warmup-log-content spring-banner'
    }
    if (text.includes('BUILD SUCCESS')) {
      return 'warmup-log-content maven-success'
    }
    return 'warmup-log-content'
  }

  // Manual reset in case of local failures
  const handleForceClose = () => {
    setShouldShow(false)
    setTimeout(() => setIsRendered(false), 500)
  }

  return (
    <div className={`warmup-console-backdrop ${shouldShow ? 'fade-in' : 'fade-out'}`}>
      <div className={`warmup-console-window slide-up ${shouldShow ? 'slide-up' : 'slide-down'}`}>
        
        {/* Terminal Header */}
        <header className="warmup-console-header">
          <div className="warmup-header-left">
            <div className="warmup-window-controls">
              <span className="warmup-dot red" onClick={handleForceClose} title="Skip Warmup Simulator" />
              <span className="warmup-dot yellow" />
              <span className="warmup-dot green" />
            </div>
            <Terminal size={14} className="text-slate-400 warmup-terminal-icon" />
            <h3 className="warmup-console-title">Render Service Deployment</h3>
            <span className="warmup-service-badge">srv-d84so6f7f7vs73fti3s0</span>
          </div>

          <div className="warmup-header-right">
            <div className={`warmup-status-indicator ${error ? 'error' : ''}`}>
              <span className={`warmup-status-dot ${!completedBuild && !error ? 'pulse' : ''}`} />
              <span>
                {error ? 'Warmup Interrupted' : completedBuild ? 'Service Active' : isFastForward ? 'Finalizing...' : 'Cold Starting...'}
              </span>
            </div>
          </div>
        </header>

        {/* Deployment Meta details */}
        <section className="warmup-metadata-panel">
          <div className="warmup-meta-item">
            <span className="warmup-meta-label">Deploy Endpoint</span>
            <span className="warmup-meta-value">dashboard-backend</span>
          </div>
          <div className="warmup-meta-item">
            <span className="warmup-meta-label">Environment</span>
            <span className="warmup-meta-value">free-tier-warmup</span>
          </div>
          <div className="warmup-meta-item">
            <span className="warmup-meta-label">Build Stage</span>
            <span className="warmup-meta-value" style={{ textTransform: 'uppercase', color: error ? '#ef4444' : '#10b981' }}>
              {error ? 'failed' : stage}
            </span>
          </div>
          <div className="warmup-meta-item">
            <span className="warmup-meta-label">Elapsed Time</span>
            <span className="warmup-meta-value">{formatTime(secondsElapsed)}</span>
          </div>
        </section>

        {/* Build Progress track */}
        <div className="warmup-progress-container">
          <div className="warmup-progress-bar-track">
            <div 
              className="warmup-progress-bar-fill" 
              style={{ 
                width: `${getProgressPercentage()}%`,
                backgroundColor: error ? '#ef4444' : undefined,
                backgroundImage: error ? 'none' : undefined
              }} 
            />
          </div>
        </div>

        {/* Scrollable Terminal Console */}
        <div className="warmup-console-terminal">
          {logs.map((log, index) => (
            <div key={index} className="warmup-log-line">
              <span className="warmup-log-timestamp">
                {log.timestamp.substring(11, 23)}
              </span>
              {log.type && (
                <span className={`warmup-log-source ${log.type}`}>
                  {log.type}
                </span>
              )}
              <div className={getLogContentClass(log.text, log.type)}>
                {log.text}
              </div>
            </div>
          ))}
          
          {/* Diagnostic Error Block */}
          {error && (
            <div className="warmup-error-alert">
              <div className="warmup-error-title">
                <ShieldAlert size={16} />
                <span>Connection Establishment Timeout</span>
              </div>
              <p className="warmup-error-description">
                The Render service is taking longer than usual to complete its cold-start or your network connection is interrupted. 
                Error signature: <code style={{ color: '#f87171' }}>{error.message || 'NET::ERR_CONNECTION_TIMED_OUT'}</code>
              </p>
              <div className="warmup-error-actions">
                <button 
                  type="button" 
                  className="warmup-action-btn primary" 
                  onClick={() => {
                    refetch()
                  }}
                >
                  <RefreshCw size={12} className="inline mr-1 animate-spin" /> Retry Connection
                </button>
                <button 
                  type="button" 
                  className="warmup-action-btn secondary"
                  onClick={handleForceClose}
                >
                  Dismiss Console
                </button>
              </div>
            </div>
          )}

          {/* Scrolling tracking point */}
          {!completedBuild && !error && (
            <div className="warmup-log-line" style={{ display: 'flex', alignItems: 'center' }}>
              <span className="warmup-log-timestamp">
                {getDynamicTimestamp().substring(11, 23)}
              </span>
              <span className="warmup-log-source system">system</span>
              <div className="warmup-log-content text-emerald-400 font-medium">
                {stage === 'cloning' && <><Cpu size={12} className="inline mr-1 animate-spin" /> Checking build cache and repo sync...</>}
                {stage === 'docker' && <><Cpu size={12} className="inline mr-1 animate-pulse" /> Resolving container overlays and caching layer...</>}
                {stage === 'maven' && <><Cpu size={12} className="inline mr-1 animate-spin" /> Compiling sources & downloading maven packages...</>}
                {stage === 'spring' && <><Database size={12} className="inline mr-1 animate-pulse" /> Spring Application init... Binding reactive Mongo pools...</>}
                {stage === 'live' && <><CheckCircle2 size={12} className="inline mr-1 text-emerald-400" /> Connection established. Unlocking cockpit...</>}
                <span className="warmup-console-cursor" />
              </div>
            </div>
          )}
          
          <div ref={terminalEndRef} />
        </div>

        {/* Footer controls */}
        <footer className="warmup-console-footer">
          <div className="warmup-footer-left">
            <span className="warmup-footer-label">Terminal Stream:</span>
            <button 
              type="button" 
              className={`warmup-toggle-btn ${isVerbose ? 'active' : ''}`}
              onClick={() => setIsVerbose(prev => !prev)}
            >
              {isVerbose ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>{isVerbose ? 'Showing Verbose Logs' : 'Milestone Summary Only'}</span>
            </button>
          </div>

          <div className="warmup-footer-right">
            {!error && !completedBuild && (
              <span className="text-xs text-slate-500 font-medium" style={{ fontFamily: 'monospace' }}>
                <Network size={12} className="inline mr-1 animate-pulse text-emerald-400" />
                Active WebSocket pipeline pings active...
              </span>
            )}
            {(error || completedBuild) && (
              <button 
                type="button" 
                className="warmup-action-btn secondary"
                onClick={handleForceClose}
              >
                Close Console
              </button>
            )}
          </div>
        </footer>

      </div>
    </div>
  )
}
