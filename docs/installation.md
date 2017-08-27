Installation
===

First, as **kuill** works by acting as an authenticating-proxy, you must configure your cluster for this authentication 
mechanism; see [the kubernetes docs](https://kubernetes.io/docs/admin/authentication/#authenticating-proxy) for details.

More concretely, you should follow these steps:

1. Generate a certificate and private key that will be used by **kuill** to authenticate user's requests to the Kubernetes API.

   - You can generate a new CA for this purpose, or reuse the same CA that was used for generating the original set of cluster certificates.
   - Take note of:
      - The path to the CA you used to generate the certificates; this path needs to be accessible to the `kube-apiserver` (self-signed certificates are not well supported by Golang PKI libraries)
      - The `cn` specified in the certificate you generate.

1. Add the following configuration flags to the `kube-apiserver`:
   - `--requestheader-client-ca-file` : value should be the path to the CA used to generate your client certificates for **kuill**; if you have more than one authenticating proxy in your cluster, they should all have their certificates generated using the same CA
   - `--requestheader-allowed-names` : value should be a comma-separated list that includes the `cn` value specified in the certifcates you generated for **kuill**.
   - The following additional flags can be specified, but the defaults are usually fine; see the kubernetes docs (mentioned above)
      - `--requestheader-username-headers`: (optional) default value is "X-Remote-User"
      - `--requestheader-group-headers` : (optional) default value is "X-Remote-Group"
      - `--requestheader-extra-headers-prefix` : (optional) default value is "X-Remote-Extra-"

1. Configure an authentication integration for **kuill**

   - OpenID+Connect:
   ```text
   --public-url value                 The public-facing URL for this app, used to compose callbacks for IDPs [$KUILL_PUBLIC_URL]
   --oidc-provider value              The OIDC provider base URL [$KUILL_OIDC_PROVIDER]
   --oidc-provider-description value  The OIDC provider display name [$KUILL_OIDC_PROVIDER_DESCRIPTION]
   --oidc-provider-name value         The OIDC provider short name (identifier) [$KUILL_OIDC_PROVIDER_NAME]
   --oidc-user-claim value            The OIDC claim that should be passed as the user's ID in kube API proxy calls (default: "email") [$KUILL_OIDC_USER_CLAIM]
   --oidc-groups-claim value          The OIDC claim that should be passed as the user's groups in kube API proxy calls (default: "groups") [$KUILL_OIDC_GROUPS_CLAIM]
   --oidc-additional-scopes value     A comma-separated list of additional OAuth2 scopes ('openidconnect' is already included) to request (default: "email,profile") [$KUILL_OIDC_ADDITIONAL_SCOPES]
   --oidc-client-id value             The OAuth2 client ID [$KUILL_OIDC_CLIENT_ID]
   --oidc-client-secret value         The OAuth2 client secret [$KUILL_OIDC_CLIENT_SECRET]
   --oidc-nonce value                 The OIDC nonce value to use (default: "a3VpbGx2MC4xLWEzLTEyLWdkNDUzOTkzK2xvY2FsX2NoYW5nZXNkNDUzOTkzMzgyYTZjNGY1ZWY2NThjZTBlZDg2ZmFhNTBlYzc3ZjNh") [$KUILL_OIDC_NONCE]
   --oidc-credentials-in-query        Whether to pass client-id and client-secret as query parameters when communicating
   with the provider [$KUILL_OIDC_CREDENTIALS_IN_QUERY]
   ```

   - SAML2:
   ```text
   --public-url value                 The public-facing URL for this app, used to compose callbacks for IDPs [$KUILL_PUBLIC_URL]
   --saml-idp-metadata-url value      The metadata URL for a SAML identity provider [$KUILL_SAML_IDP_METADATA_URL]
   --saml-idp-shortname value         The short name to use for the saml identity provider [$KUILL_SAML_IDP_SHORTNAME]
   --saml-idp-description value       The description for the saml identity provider [$KUILL_SAML_IDP_DESCRIPTION]
   --saml-sp-cert value               The certificate file to use for this service provider [$KUILL_SAML_SP_CERT]
   --saml-sp-key value                The private key file to use for this service provider [$KUILL_SAML_SP_KEY]
   --saml-groups-attribute value      The name of the attribute containing the user's groups [$KUILL_SAML_GROUPS_ATTRIBUTE]
   --saml-groups-delimiter value      The delimiter that, if specified, will be used to split single group values into multiple groups [$KUILL_SAML_GROUPS_DELIMITER]
   --saml-audience value              The audience that will be used to verify incoming assertions; defaults to using the metadata url of this service provider [$KUILL_SAML_AUDIENCE]
   ```

   - Password File (intended only for testing/demo purposes)
   ```text
   --password-file value              A file containing tab-delimited set of [user,password,group...], on per line; for local testing only [$KUILL_PASSWORD_FILE]
   ```