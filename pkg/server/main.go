package main

import (
	"fmt"
	"os"
	"strings"

	"mime"
	"net/http"
	"path/filepath"

	"encoding/base64"

	"github.com/matt-deboer/kapow/pkg/auth"
	"github.com/matt-deboer/kapow/pkg/metrics"
	"github.com/matt-deboer/kapow/pkg/proxy"
	"github.com/matt-deboer/kapow/pkg/templates"
	"github.com/matt-deboer/kapow/pkg/version"
	log "github.com/sirupsen/logrus"
	"github.com/urfave/cli"
	"golang.org/x/oauth2"
)

// Name is set at compile time based on the git repository
var Name string

// Version is set at compile time with the git version
var Version string

func main() {

	envBase := strings.ToUpper(version.Name) + "_"

	app := cli.NewApp()
	app.Name = Name
	app.Usage = `
		Launch a server which simultaneously provides the Kapow UI,
		and acts as an OIDC server endpoint and Authenticating Proxy for
		the Kubernetes API.
		`
	app.Version = Version
	app.Flags = []cli.Flag{
		cli.IntFlag{
			Name:   "port",
			Value:  8443,
			Usage:  "The port on which the server will listen",
			EnvVar: envBase + "PORT",
		},
		cli.StringFlag{
			Name:   "server-cert",
			Usage:  "The PEM-encoded cert file use by the app for TLS communication",
			EnvVar: envBase + "SERVER_CERT",
		},
		cli.StringFlag{
			Name:   "server-key",
			Usage:  "The PEM-encoded key file used by the app for TLS communication",
			EnvVar: envBase + "SERVER_KEY",
		},
		cli.StringFlag{
			Name:   "kubernetes-api",
			Usage:  "The kubernetes API endpoint to contact",
			Value:  "https://kubernetes.default",
			EnvVar: envBase + "KUBERNETES_API",
		},
		cli.StringFlag{
			Name:   "kubernetes-client-cert",
			Usage:  "The PEM-encoded cert file used to authenticate the client to the kubernetes API",
			EnvVar: envBase + "KUBERNETES_CLIENT_CERT",
		},
		cli.StringFlag{
			Name:   "kubernetes-client-key",
			Usage:  "The PEM-encoded key file used to authenticate the client to the kubernetes API",
			EnvVar: envBase + "KUBERNETES_CLIENT_KEY",
		},
		cli.StringFlag{
			Name:   "kubernetes-client-ca",
			Usage:  "The PEM-encoded ca cert used to identify the remote kubernetes server cert",
			EnvVar: envBase + "KUBERNETES_CLIENT_CA",
		},
		cli.StringFlag{
			Name:   "public-url",
			Usage:  "The public-facing URL for this app, used to compose callbacks for IDPs",
			EnvVar: envBase + "PUBLIC_URL",
		},
		cli.StringFlag{
			Name:   "oidc-provider",
			Usage:  "The OIDC provider base URL",
			EnvVar: envBase + "OIDC_PROVIDER",
		},
		cli.StringFlag{
			Name:   "oidc-provider-name",
			Usage:  "The OIDC provider display name",
			EnvVar: envBase + "OIDC_PROVIDER_NAME",
		},
		cli.StringFlag{
			Name:   "oidc-user-claim",
			Usage:  "The OIDC claim that should be passed as the user's ID in kube API proxy calls",
			Value:  "email",
			EnvVar: envBase + "OIDC_USER_CLAIM",
		},
		cli.StringFlag{
			Name:   "oidc-groups-claim",
			Usage:  "The OIDC claim that should be passed as the user's groups in kube API proxy calls",
			Value:  "groups",
			EnvVar: envBase + "OIDC_GROUPS_CLAIM",
		},
		cli.StringFlag{
			Name:   "oidc-additional-scopes",
			Usage:  "A comma-separated list of additional OAuth2 scopes ('openidconnect' is already included) to request",
			Value:  "email,profile",
			EnvVar: envBase + "OIDC_ADDITIONAL_SCOPES",
		},
		cli.StringFlag{
			Name:   "oidc-client-id",
			Usage:  "The OAuth2 client ID",
			EnvVar: envBase + "OIDC_CLIENT_ID",
		},
		cli.StringFlag{
			Name:   "oidc-client-secret",
			Usage:  "The OAuth2 client secret",
			EnvVar: envBase + "OIDC_CLIENT_SECRET",
		},
		cli.StringFlag{
			Name:   "oidc-nonce",
			Usage:  "The OIDC nonce value to use",
			Value:  base64.StdEncoding.EncodeToString([]byte(version.Name + version.Version + version.Revision)),
			EnvVar: envBase + "OIDC_NONCE",
		},
		cli.BoolFlag{
			Name: "oidc-credentials-in-query",
			Usage: `Whether to pass client-id and client-secret as query parameters when communicating
				with the provider`,
			EnvVar: envBase + "OIDC_CREDENTIALS_IN_QUERY",
		},
		cli.StringFlag{
			Name:   "username-header",
			Value:  "X-Remote-User",
			Usage:  "The header name passed to the Kubernetes API containing the user's identity",
			EnvVar: envBase + "USERNAME_HEADER",
		},
		cli.StringFlag{
			Name:   "group-header",
			Value:  "X-Remote-Group",
			Usage:  "The header name passed to the Kubernetes API containing the user's groups",
			EnvVar: envBase + "GROUP_HEADER",
		},
		cli.StringFlag{
			Name:   "extra-headers-prefix",
			Value:  "X-Remote-Extra-",
			Usage:  "The header name prefix passed to the Kubernetes API containing extra user information",
			EnvVar: envBase + "EXTRA_HEADERS_PREFIX",
		},
		cli.StringFlag{
			Name:   "password-file",
			Usage:  "A file containing tab-delimited set of [user,password,group...], on per line; for local testing only",
			EnvVar: envBase + "PASSWORD_FILE",
		},
		cli.BoolFlag{
			Name:   "disable-anonymous",
			Usage:  "Disables the anonymous login",
			EnvVar: envBase + "DISABLE_ANONYMOUS",
		},
		cli.StringFlag{
			Name:   "anonymous-user",
			Usage:  "This user ID will be used for anonymous login",
			Value:  "anonymous",
			EnvVar: envBase + "ANONYMOUS_USER",
		},
		cli.StringFlag{
			Name: "anonymous-groups",
			Usage: `This comma-separated list of groups will be automatically applied to all proxy requests using 
			the anonymous login`,
			Value:  "system:authenticated",
			EnvVar: envBase + "ANONYMOUS_GROUPS",
		},
		cli.StringFlag{
			Name:   "templates-path",
			Value:  "./templates",
			Usage:  "The path containing a set of *.json and/or *.yml/*.yaml files that are used to initialize the editor for a new resource",
			EnvVar: envBase + "TEMPLATES_PATH",
		},
		cli.StringFlag{
			Name:   "kubeconfig",
			Usage:  "The path to the kubeconfig file; defaults to using in-cluster config",
			EnvVar: envBase + "KUBECONFIG",
		},
		cli.BoolFlag{
			Name:   "trace-requests, T",
			Usage:  "Log information about all requests",
			EnvVar: envBase + "TRACE_REQUESTS",
		},
		cli.BoolFlag{
			Name:   "verbose, V",
			Usage:  "Log extra information about steps taken",
			EnvVar: envBase + "VERBOSE",
		},
	}
	app.Action = func(c *cli.Context) {

		if c.Bool("verbose") {
			log.SetLevel(log.DebugLevel)
		}

		port := requiredInt(c, "port")
		serverCert := requiredString(c, "server-cert")
		serverKey := requiredString(c, "server-key")

		authManager, _ := auth.NewAuthManager()
		setupAuthenticators(c, authManager)
		setupProxy(c, authManager)
		setupTemplates(c)
		setupMetrics(c, authManager)

		http.HandleFunc("/", serveUI)

		addr := fmt.Sprintf(":%d", port)
		log.Infof("%s!@%s listening on %s", version.Name, version.Version, addr)
		log.Fatal(http.ListenAndServeTLS(addr, serverCert, serverKey, nil))
	}
	app.Run(os.Args)
}

func argError(c *cli.Context, msg string, args ...interface{}) {
	log.Errorf(msg+"\n", args...)
	cli.ShowAppHelp(c)
	os.Exit(1)
}

func requiredString(c *cli.Context, name string) string {
	value := c.String(name)
	if len(value) == 0 {
		argError(c, fmt.Sprintf("'%s' is required.", name))
	}
	return value
}

func requiredInt(c *cli.Context, name string) int {
	value := c.Int(name)
	if value == 0 {
		argError(c, fmt.Sprintf("'%s' is required.", name))
	}
	return value
}

func serveUI(w http.ResponseWriter, r *http.Request) {

	path := r.URL.Path
	if path == "/" {
		path = "index.html"
	} else if strings.HasPrefix(path, "/") {
		path = path[1:]
	}

	data, err := Asset(path)
	if err != nil {
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Could not find asset: %s", path)
		}
		http.NotFound(w, r)
	} else {
		ext := filepath.Ext(path)
		if len(ext) > 0 {
			w.Header().Set("Content-Type", mime.TypeByExtension(ext))
		}
		w.Write(data)
	}
}

func setupAuthenticators(c *cli.Context, authManager *auth.Manager) {

	flags, err := getRequiredFlags(c, map[string]string{
		"public-url":                "string",
		"oidc-provider-name":        "string",
		"oidc-provider":             "string",
		"oidc-client-id":            "string",
		"oidc-client-secret":        "string",
		"oidc-additional-scopes":    "string",
		"oidc-user-claim":           "string",
		"oidc-groups-claim":         "string",
		"oidc-credentials-in-query": "bool",
	})

	if err == nil {

		additionalScopes := strings.Split(flags["oidc-additional-scopes"].(string), ",")

		provider := flags["oidc-provider"].(string)
		if flags["oidc-credentials-in-query"].(bool) {
			oauth2.RegisterBrokenAuthHeaderProvider(provider)
		}

		oidcHandler, err := auth.NewOIDCHandler(
			flags["oidc-provider-name"].(string),
			flags["public-url"].(string),
			provider,
			flags["oidc-client-id"].(string),
			flags["oidc-client-secret"].(string),
			additionalScopes,
			flags["oidc-user-claim"].(string),
			flags["oidc-groups-claim"].(string),
		)
		if err != nil {
			log.Fatal(err)
		}
		authManager.RegisterAuthenticator(oidcHandler)
	} else {
		log.Warnf("OpenID+Connect authenticator is not enabled; %s", err)
	}

	passwordFile := c.String("password-file")
	if len(passwordFile) > 0 {
		pwFileAuthN, err := auth.NewPasswordFileHandler(authManager, passwordFile, passwordFile)
		if err != nil {
			log.Fatal(err)
		}
		authManager.RegisterAuthenticator(pwFileAuthN)
	}

	if !c.Bool("disable-anonymous") {
		anonymousGroups := c.String("anonymous-groups")
		groups := []string{}
		if len(anonymousGroups) > 0 {
			groups = strings.Split(anonymousGroups, ",")
		}
		authManager.RegisterAuthenticator(
			auth.NewAnonymousHandler(
				c.String("anonymous-user"),
				groups))
	}

}

func setupProxy(c *cli.Context, authManager *auth.Manager) {

	flags, err := getRequiredFlags(c, map[string]string{
		"kubernetes-api":         "string",
		"kubernetes-client-ca":   "string",
		"kubernetes-client-cert": "string",
		"kubernetes-client-key":  "string",
		"username-header":        "string",
		"group-header":           "string",
		"extra-headers-prefix":   "string",
		"trace-requests":         "bool",
	})

	if err == nil {
		apiProxy, err := proxy.NewKubeAPIProxy(flags["kubernetes-api"].(string), "/proxy",
			flags["kubernetes-client-ca"].(string),
			flags["kubernetes-client-cert"].(string),
			flags["kubernetes-client-key"].(string),
			flags["username-header"].(string),
			flags["group-header"].(string),
			flags["extra-headers-prefix"].(string),
			flags["trace-requests"].(bool),
		)
		if err != nil {
			log.Fatal(err)
		}
		http.HandleFunc("/proxy/", authManager.NewAuthDelegate(apiProxy.ProxyRequest))
	} else {
		log.Warnf("Kubernetes proxy is not enabled; %s", err)
	}
}

func setupMetrics(c *cli.Context, authManager *auth.Manager) {
	provider, err := metrics.NewMetricsProvider(c.String("kubeconfig"))
	if err != nil {
		log.Errorf("Failed to configure metrics adapter: %v", err)
	} else {
		http.HandleFunc("/metrics", authManager.NewAuthDelegate(provider.GetMetrics))
	}
}

func setupTemplates(c *cli.Context) {
	templatesPath := c.String("templates-path")
	templates.Setup(templatesPath)
}

func getRequiredFlags(c *cli.Context, flags map[string]string) (map[string]interface{}, error) {
	resolved := make(map[string]interface{})
	missing := []string{}
	for name, kind := range flags {
		if kind == "int" {
			val := c.Int(name)
			if val != 0 {
				resolved[name] = val
			} else {
				missing = append(missing, name)
			}
		} else if kind == "string" {
			val := c.String(name)
			if len(val) > 0 {
				resolved[name] = val
			} else {
				missing = append(missing, name)
			}
		} else if kind == "bool" {
			resolved[name] = c.Bool(name)
		}
	}
	if len(missing) > 0 {
		return resolved, fmt.Errorf("the following required flags were missing: %s", strings.Join(missing, ", "))
	}
	return resolved, nil
}
