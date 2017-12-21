package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"mime"
	"net/http"
	"path/filepath"

	"encoding/base64"

	"github.com/matt-deboer/kuill/pkg/auth"
	"github.com/matt-deboer/kuill/pkg/clients"
	"github.com/matt-deboer/kuill/pkg/metrics"
	"github.com/matt-deboer/kuill/pkg/proxy"
	"github.com/matt-deboer/kuill/pkg/templates"
	"github.com/matt-deboer/kuill/pkg/version"
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
		Launch a server which simultaneously provides the kuill UI,
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
		cli.IntFlag{
			Name:   "redirect-port",
			Value:  80,
			Usage:  "The port which answers http requests by redirecting to the https port",
			EnvVar: envBase + "REDIRECT_PORT",
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
		cli.DurationFlag{
			Name:   "session-timeout",
			Usage:  "The idle timeout for sessions",
			Value:  time.Minute * 15,
			EnvVar: envBase + "SESSION_TIMEOUT",
		},
		cli.StringFlag{
			Name:   "oidc-provider",
			Usage:  "The OIDC provider base URL",
			EnvVar: envBase + "OIDC_PROVIDER",
		},
		cli.StringFlag{
			Name:   "oidc-provider-description",
			Usage:  "The OIDC provider display name",
			EnvVar: envBase + "OIDC_PROVIDER_DESCRIPTION",
		},
		cli.StringFlag{
			Name:   "oidc-provider-name",
			Usage:  "The OIDC provider short name (identifier)",
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
				with the provider (Okta, for example)`,
			EnvVar: envBase + "OIDC_CREDENTIALS_IN_QUERY",
		},
		cli.StringFlag{
			Name:   "saml-idp-metadata-url",
			Usage:  `The metadata URL for a SAML identity provider`,
			EnvVar: envBase + "SAML_IDP_METADATA_URL",
		},
		cli.StringFlag{
			Name:   "saml-idp-shortname",
			Usage:  `The short name to use for the saml identity provider`,
			EnvVar: envBase + "SAML_IDP_SHORTNAME",
		},
		cli.StringFlag{
			Name:   "saml-idp-description",
			Usage:  `The description for the saml identity provider`,
			EnvVar: envBase + "SAML_IDP_DESCRIPTION",
		},
		cli.StringFlag{
			Name:   "saml-sp-cert",
			Usage:  `The certificate file to use for this service provider`,
			EnvVar: envBase + "SAML_SP_CERT",
		},
		cli.StringFlag{
			Name:   "saml-sp-key",
			Usage:  `The private key file to use for this service provider`,
			EnvVar: envBase + "SAML_SP_KEY",
		},
		cli.StringFlag{
			Name:   "saml-groups-attribute",
			Usage:  `The name of the attribute containing the user's groups`,
			EnvVar: envBase + "SAML_GROUPS_ATTRIBUTE",
		},
		cli.StringFlag{
			Name:   "saml-groups-delimiter",
			Usage:  `The delimiter that, if specified, will be used to split single group values into multiple groups`,
			EnvVar: envBase + "SAML_GROUPS_DELIMITER",
		},
		cli.StringFlag{
			Name:   "saml-audience",
			Usage:  `The audience that will be used to verify incoming assertions; defaults to using the metadata url of this service provider`,
			EnvVar: envBase + "SAML_AUDIENCE",
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
			Usage:  "A file containing tab-delimited set of [user,password,group...], one per line; for local testing only",
			EnvVar: envBase + "PASSWORD_FILE",
		},
		cli.BoolFlag{
			Name: "disable-tls",
			Usage: `Whether to disable TLS for this service; this should be used only for testing and initial integration,
			as it will break most security features`,
			EnvVar: envBase + "DISABLE_TLS",
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
			Name: "authenticated-groups",
			Usage: `This comma-separated list of groups will be automatically applied to all proxy requests for 
			authenticated users (including the anonymous login, if enabled)`,
			Value:  "system:authenticated",
			EnvVar: envBase + "AUTHENTICATED_GROUPS",
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
			Name: "proxy-authentication",
			Usage: `When 'true', use authenticating-proxy headers to authenticate the current user to the backend kubernetes API; when false
			(the default) impersonation headers are used`,
			EnvVar: envBase + "PROXY_AUTHENTICATION",
		},
		cli.BoolFlag{
			Name:   "trace-requests, T",
			Usage:  "Log information about all requests",
			EnvVar: envBase + "TRACE_REQUESTS",
		},
		cli.BoolFlag{
			Name:   "trace-websockets, W",
			Usage:  "Log information about all websocket actions",
			EnvVar: envBase + "TRACE_WEBSOCKETS",
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
		disableTLS := c.Bool("disable-tls")
		redirectPort := requiredInt(c, "redirect-port")
		serverCert := requiredString(c, "server-cert")
		serverKey := requiredString(c, "server-key")

		kubeClients := setupClients(c)

		sessionTimeout := c.Duration("session-timeout")

		authManager, err := auth.NewAuthManager(sessionTimeout)
		if err != nil {
			log.Fatal(err)
		}

		setupAuthenticators(c, authManager)
		setupProxy(c, authManager, kubeClients)
		setupTemplates(c)
		setupMetrics(c, authManager, kubeClients)

		http.HandleFunc("/version", version.Serve)
		http.HandleFunc("/", serveUI)

		addr := fmt.Sprintf(":%d", port)

		log.Infof("%s!@%s listening on %s", version.Name, version.Version, addr)
		if disableTLS {
			log.Warnf("TLS is disabled; server is running in an insecure configuration")
			log.Fatal(http.ListenAndServe(addr, nil))
		} else if redirectPort != port {
			redirectAddr := fmt.Sprintf(":%d", redirectPort)
			log.Infof("Redirecting http://%s => https://%s", redirectAddr, addr)
			go http.ListenAndServe(redirectAddr, http.HandlerFunc(redirectTLS))

			log.Fatal(http.ListenAndServeTLS(addr, serverCert, serverKey, nil))
		} else {
			log.Infof("Redirecting http://%s => https://%s", addr, addr)
			log.Fatal(ListenAndServeTLSWithRedirect(addr, serverCert, serverKey))
		}
	}
	app.Run(os.Args)
}

func redirectTLS(w http.ResponseWriter, req *http.Request) {
	http.Redirect(w, req,
		"https://"+req.Host+req.URL.String(),
		http.StatusMovedPermanently)
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

	oidcFlags, err := getRequiredFlags(c, map[string]string{
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

		additionalScopes := strings.Split(oidcFlags["oidc-additional-scopes"].(string), ",")

		provider := oidcFlags["oidc-provider"].(string)
		if oidcFlags["oidc-credentials-in-query"].(bool) {
			oauth2.RegisterBrokenAuthHeaderProvider(provider)
		}

		oidcHandler, err := auth.NewOIDCHandler(
			oidcFlags["oidc-provider-name"].(string),
			c.String("oidc-provider-description"),
			oidcFlags["public-url"].(string),
			provider,
			oidcFlags["oidc-client-id"].(string),
			oidcFlags["oidc-client-secret"].(string),
			additionalScopes,
			oidcFlags["oidc-user-claim"].(string),
			oidcFlags["oidc-groups-claim"].(string),
			c.String("oidc-nonce"),
		)
		if err != nil {
			log.Fatal(err)
		}
		authManager.RegisterAuthenticator(oidcHandler)
	} else {
		log.Warnf("OpenID+Connect authenticator is not enabled; %s", err)
	}

	samlFlags, err := getRequiredFlags(c, map[string]string{
		"public-url":            "string",
		"saml-groups-attribute": "string",
		"saml-sp-cert":          "string",
		"saml-sp-key":           "string",
	})

	if err == nil {
		samlHandler, err := auth.NewSamlHandler(
			samlFlags["public-url"].(string),
			samlFlags["saml-sp-key"].(string),
			samlFlags["saml-sp-cert"].(string),
			c.String("saml-idp-shortname"),
			c.String("saml-idp-description"),
			c.String("saml-idp-metadata-url"),
			samlFlags["saml-groups-attribute"].(string),
			c.String("saml-groups-delimiter"),
			c.String("saml-audience"),
		)
		if err != nil {
			log.Fatal(err)
		}
		err = authManager.RegisterAuthenticator(samlHandler)
		if err != nil {
			log.Fatal(err)
		}
	} else {
		log.Warnf("SAML authenticator is not enabled; %s", err)
	}

	passwordFile := c.String("password-file")
	if len(passwordFile) > 0 {
		pwFileAuthN, err := auth.NewPasswordFileHandler(authManager, passwordFile, passwordFile)
		if err != nil {
			log.Fatal(err)
		}
		err = authManager.RegisterAuthenticator(pwFileAuthN)
		if err != nil {
			log.Fatal(err)
		}
	}

	if !c.Bool("disable-anonymous") {
		anonymousGroups := c.String("anonymous-groups")
		groups := []string{}
		if len(anonymousGroups) > 0 {
			groups = strings.Split(anonymousGroups, ",")
		}
		err = authManager.RegisterAuthenticator(
			auth.NewAnonymousHandler(
				c.String("anonymous-user"),
				groups))

		if err != nil {
			log.Fatal(err)
		}
	} else {
		log.Infof("Anonymous authenticator disabled")
	}

}

func setupClients(c *cli.Context) *clients.KubeClients {
	flags, err := getRequiredFlags(c, map[string]string{
		"kubernetes-client-ca":   "string",
		"kubernetes-client-cert": "string",
		"kubernetes-client-key":  "string",
	})

	if err != nil {
		log.Fatalf("Could not create kubernetes client; %v", err)
	}
	kubeClients, err := clients.Create(c.String("kubeconfig"),
		flags["kubernetes-client-ca"].(string),
		flags["kubernetes-client-cert"].(string),
		flags["kubernetes-client-key"].(string),
	)
	if err != nil {
		log.Fatal(err)
	}
	return kubeClients
}

func setupProxy(c *cli.Context, authManager *auth.Manager, kubeClients *clients.KubeClients) {

	flags, err := getRequiredFlags(c, map[string]string{
		"kubernetes-api":         "string",
		"kubernetes-client-ca":   "string",
		"kubernetes-client-cert": "string",
		"kubernetes-client-key":  "string",
		"username-header":        "string",
		"group-header":           "string",
		"extra-headers-prefix":   "string",
		"trace-requests":         "bool",
		"trace-websockets":       "bool",
		"proxy-authentication":   "bool",
		"authenticated-groups":   "string",
	})

	if err == nil {
		var authenticatedGroups []string
		groupsString := flags["authenticated-groups"].(string)
		if len(groupsString) > 0 {
			authenticatedGroups = regexp.MustCompile(`\s*,\s*`).Split(groupsString, -1)
		}

		kinds, err := proxy.NewKindsProxy(kubeClients)
		if err != nil {
			log.Fatal(err)
		}
		namespaces := proxy.NewNamespacesProxy(kubeClients)
		swagger := proxy.NewSwaggerProxy(kubeClients)
		access := proxy.NewAccessProxy(kubeClients, authManager, kinds, namespaces)

		usernameHeader := flags["username-header"].(string)
		groupsHeader := flags["group-header"].(string)
		extraHeaders := flags["extra-headers-prefix"].(string)

		proxyAuthentication := flags["proxy-authentication"].(bool)

		if !proxyAuthentication {
			// Use impersonation instead
			usernameHeader = "Impersonate-User"
			groupsHeader = "Impersonate-Group"
			extraHeaders = "Impersonate-Extra-"
		}

		apiProxy, err := proxy.NewKubeAPIProxy(flags["kubernetes-api"].(string), "/proxy",
			flags["kubernetes-client-ca"].(string),
			flags["kubernetes-client-cert"].(string),
			flags["kubernetes-client-key"].(string),
			usernameHeader,
			groupsHeader,
			extraHeaders,
			authenticatedGroups,
			flags["trace-requests"].(bool),
			flags["trace-websockets"].(bool),
			kinds,
			namespaces,
			access,
		)
		if err != nil {
			log.Fatal(err)
		}

		resources := proxy.NewResourcesProxy(kubeClients, authManager, kinds, namespaces, apiProxy)

		http.HandleFunc("/proxy/swagger.json", swagger.Serve)
		http.HandleFunc("/proxy/_/kinds", kinds.Serve)
		http.HandleFunc("/proxy/_/namespaces", namespaces.Serve)

		http.HandleFunc("/proxy/_/resources/list", authManager.NewAuthDelegate(resources.Serve))
		http.HandleFunc("/proxy/_/accessreview", authManager.NewAuthDelegate(access.Serve))
		http.HandleFunc("/proxy/", authManager.NewAuthDelegate(apiProxy.ProxyRequest))

	} else {
		log.Warnf("Kubernetes proxy is not enabled; %s", err)
	}
}

func setupMetrics(c *cli.Context, authManager *auth.Manager, kubeClients *clients.KubeClients) {
	provider, err := metrics.NewMetricsProvider(kubeClients)
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
