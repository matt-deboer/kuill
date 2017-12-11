package proxy

// AccessReviewAggregator provides aggregation for the multiple fine-grained
// SubjectAccessReview and SubjectRulesReview requests required in order to
// present a graphical UI over multiple resources and namespaces
// type AccessReviewAggregator struct {
// 	kubeClient          *kubernetes.Clientset
// 	authManager     auth.Manager
// 	kindLister      *KindLister
// 	namespaceLister *nsLister
// 	bearerToken     string
// }

// func ServeAccessReview(kubeClient *kubernetes.Clientset, bearerToken string, authManager *auth.Manager, kindLister *KindLister, namespaceLister *nsLister) {
// 	a := &AccessReviewAggregator{
// 		kubeClient:  kubeClient,
// 		authManager:     authManager,
// 		kindLister:      kindLister,
// 		namespaceLister: namespaceLister,
// 		bearerToken:     bearerToken,
// 	}
// 	http.HandleFunc("/proxy/_/accessreview", a.serveAccessReview)
// }

// func serveAccessReview(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

// }

// type accessResult struct {
// 	resp *authorizationv1.SubjectAccessReview
// 	err  error
// }

// func (a *AccessReviewAggregator) getAccess(namespace, resource, subresource, name string, results chan *accessResult) {

// 	attrs := &authorizationv1.ResourceAttributes{
// 		Group:     "*",
// 		Namespace: &namespace,
// 		Resource:  &resource,
// 	}
// 	if len(subresource) > 0 {
// 		attrs.Subresource = &subresource
// 	}
// 	if len(name) > 0 {
// 		attrs.Name = &name
// 	}

// 	a.kubeClient.Authorization().CreateLocalSubjectAccessReview(
// 		context.Background(),
// 		&authorizationv1.LocalSubjectAccessReview{

// 			&authorizationv1.SubjectAccessReviewSpec{
// 				User:
// 				ResourceAttributes: attrs,
// 			},
// 		})
// 	)

// 	resp, err := a.kubeClient.Authorization().CreateSubjectAccessReview(
// 		context.Background(),
// 		&authorizationv1.SubjectAccessReview{
// 			Spec: &authorizationv1.SubjectAccessReviewSpec{

// 				ResourceAttributes: attrs,
// 			},
// 		})

// 	results <- &accessResult{resp: resp, err: err}
// }

// func (a *AccessReviewAggregator) getRules(namespace, resource, subresource, name string, results chan *accessResult) {

// }

// // provides details of which resources can be listed, and in which namespaces; this
// func (a *AccessReviewAggregator) serveListAccess(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

// }

// // provides details of which resources can be watched, and at which scope
// func (a *AccessReviewAggregator) serveWatchAccess(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

// }

// // provides details of which resources can be updated/deleted/created/etc, and at which scope
// func (a *AccessReviewAggregator) serveUpdateAccess(w http.ResponseWriter, r *http.Request, authContext auth.Context) {

// }

// func (a *AccessReviewAggregator) resolveAccess(authContext auth.Context) error {

// 	namespaces, err := a.namespaceLister.getNamespaces()
// 	if err != nil {
// 		return err
// 	}

// 	results := make(chan *accessResult, len(a.kindLister.kinds)*len(namespaces))

// 	a.kindLister.mutex.RLock()
// 	defer a.kindLister.mutex.RUnlock()
// 	for _, kind := range a.kindLister.kinds {
// 		for _, namespace := range namespaces {
// 			go a.getAccess(namespace, kind.Plural, "", "", results)
// 		}
// 	}

// }
