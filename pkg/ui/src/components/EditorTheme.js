import ace from 'brace'
import './EditorTheme.css'

ace.define("ace/theme/kubernetes",["require","exports","module","ace/lib/dom"], function(acequire, exports, module) {
  
  exports.isDark = true;
  exports.cssClass = "ace-kubernetes";
  exports.cssText = require('./EditorTheme.css')
  
  var dom = acequire("ace/lib/dom")
  dom.importCssString(exports.cssText, exports.cssClass)
})