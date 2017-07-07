package templates

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"path"
	"path/filepath"
	"sort"
	"strings"

	log "github.com/Sirupsen/logrus"
)

type resourceTemplates struct {
	path          string
	templates     map[string]string
	templatesList []byte
}

// Setup prepares templates file server
func Setup(templatesPath string) error {

	templates := make(map[string]string)
	templateNames := []string{}
	files, _ := ioutil.ReadDir(templatesPath)
	for _, f := range files {
		baseFile := filepath.Base(f.Name())
		absPath, err := filepath.Abs(path.Join(templatesPath, f.Name()))
		if err != nil {
			log.Errorf("Could not resolve template path for '%s'", f.Name())
		} else if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Resolved absolute path for '%s' => '%s'", f.Name(), absPath)
		}
		templates[baseFile] = absPath
		templateNames = append(templateNames, baseFile)
	}
	sort.Strings(templateNames)

	data, err := json.Marshal(templateNames)
	if err != nil {
		return err
	}

	t := &resourceTemplates{
		templates:     templates,
		templatesList: data,
	}
	http.HandleFunc("/templates", t.listTemplates)
	http.HandleFunc("/templates/", t.getTemplate)
	return nil
}

func (t *resourceTemplates) listTemplates(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write(t.templatesList)
}

func (t *resourceTemplates) getTemplate(w http.ResponseWriter, r *http.Request) {
	templateName := strings.Replace(r.URL.Path, "/templates/", "", 1)
	templateFile, ok := t.templates[templateName]
	if ok {
		http.ServeFile(w, r, templateFile)
	} else {
		if log.GetLevel() >= log.DebugLevel {
			log.Debugf("Could not locate template '%s'", templateName)
		}
		http.NotFound(w, r)
	}
}
