package main

import (
	"crypto/rand"
	"crypto/tls"
	"net"
	"net/http"
	"strings"

	log "github.com/sirupsen/logrus"
	"github.com/soheilhy/cmux"
)

type redirectHandler struct{}

func (h *redirectHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.TLS == nil || strings.ToLower(r.Header.Get("X-Forwarded-Proto")) == "http" {
		redirectTLS(w, r)
	} else {
		http.DefaultServeMux.ServeHTTP(w, r)
	}
}

func serveHTTP1(l net.Listener) {
	s := &http.Server{
		Handler: &redirectHandler{},
	}
	if err := s.Serve(l); err != cmux.ErrListenerClosed {
		panic(err)
	}
}

func serveHTTPS(l net.Listener, certFile, keyFile string) {
	// Load certificates.
	certificate, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		log.Panic(err)
	}

	config := &tls.Config{
		Certificates: []tls.Certificate{certificate},
		Rand:         rand.Reader,
	}

	// Create TLS listener.
	tlsl := tls.NewListener(l, config)

	// Serve HTTP over TLS.
	serveHTTP1(tlsl)
}

func ListenAndServeTLSWithRedirect(addr, certFile, keyFile string) error {
	l, err := net.Listen("tcp", addr)
	if err != nil {
		log.Panic(err)
	}

	// Create a mux.
	m := cmux.New(l)

	// We first match on HTTP 1.1 methods.
	httpl := m.Match(cmux.HTTP1Fast())

	// If not matched, we assume that its TLS.
	//
	// Note that you can take this listener, do TLS handshake and
	// create another mux to multiplex the connections over TLS.
	tlsl := m.Match(cmux.Any())

	go serveHTTP1(httpl)
	go serveHTTPS(tlsl, certFile, keyFile)

	if err := m.Serve(); !strings.Contains(err.Error(), "use of closed network connection") {
		return err
	}
	return nil
}
