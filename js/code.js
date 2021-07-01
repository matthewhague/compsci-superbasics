document.getElementsByTagName("body")[0].classList.add("js");

//---------------------------------------------------------------------------
// enable "sticky" display of character codes on text file display:
// necessary in case device doesn't have mouseover
// Only highlight char divs within .text-file, which _always_ contain a span
// (each row of text is also a div, so ignore clicks on those)
//---------------------------------------------------------------------------
let textfiles = document.getElementsByClassName("text-file");
for (let i=0; i<textfiles.length; i++) {
  textfiles[i].addEventListener("click", function(e){
    let char_div;
    if (e.target.tagName === "SPAN") {
      char_div = e.target.parentElement;
    } else if (e.target.children.length === 1 && e.target.children[0].tagName === "SPAN") {
      char_div = e.target;
    }
    if (char_div) {
      char_div.classList.toggle("show-code");
    }
  });
}


//---------------------------------------------------------------------------
// highlight footnote clicks — jumping to the footnote is not enough, since
// it's at the bottom of the page: highlight it to draw reader's attention
//---------------------------------------------------------------------------
let FOOTNOTE_HILIGHT_DURATION = 2000; // milliseconds (NB: 1s transition in CSS)
let FOOTNOTE_HILIGHT_CSS = "hilight";
let footnote_links = document.getElementsByTagName("SUP");
let footnote_tid;
for (let link of footnote_links){
  if (link.parentElement.tagName==="A") {
    let href = link.parentElement.getAttribute("href");
    if (href && href.indexOf("#") === 0) {
      let target = document.getElementById(href.substr(1));
      link.parentElement.addEventListener("click", function(e){
        let footnote = document.getElementById(href.substring(1));
        clearTimeout(footnote_tid);
        if (footnote) {
          footnote = footnote.parentElement;
        }
        footnote.classList.add(FOOTNOTE_HILIGHT_CSS);
        footnote_tid = setTimeout(
          function(){ footnote.classList.remove(FOOTNOTE_HILIGHT_CSS) },
          FOOTNOTE_HILIGHT_DURATION
        );
      });
    }
  }
}

//---------------------------------------------------------------------------
// interactive directory diagrams
// check settings here match with SVG contents
// must be called only when SVG image has loaded
//---------------------------------------------------------------------------
function dir_interaction(svgElement){
  const 
        // values of data-superbasics (which of the diagrams is it?)
        TYPE_RELATIVE = "relative",
        TYPE_ABSOLUTE = "absolute",
        TYPE_PARENT   = "parent",
  
        ID_PREFIX = "dir",
        PATH_PREFIX = "path",
        TEXT_PREFIX = "text",
        ID_SEP = "-",
  
        // colours used in the diagrams
        COL_TEXT_DEFAULT = "#000",
        COL_TEXT_ON_PATH = "#fff",
        COL_DEFAULT = "#ffb",
        COL_ON_PATH = "#b00",
        COL_CURRENT = "#b00",
        COL_FROM = "#0b0",
        COL_PARENT  = "#fff",
        COL_SUBDIR  = "#ffee00",
        COL_STROKE_MAJOR = "#000",
        COL_STROKE_MINOR = "#828282",
  
        FROM_DISPLAY_NAME = "from-abs-display",
        TO_DISPLAY_NAME = "to-abs-display",
        PATH_DISPLAY_NAME = "path-display";

  let interaction_type = svgElement.dataset.superbasics;
  let dirs, paths, texts, path_display;
  let dir_elements = {};
  
  let from_dir_id = "dir-0-0-1";
  let want_new_from_dir = true;

  // array of dirs from root to dir_id
  function get_dir_array(svg_obj, dir_id) {
    let dirs = [];
    let steps = dir_id.split(ID_SEP);
    for (let i=1; i<steps.length; i++) { // start at 1 to skip prefix
      dirs.push(svg_obj.getElementById(steps.slice(0, i+1).join(ID_SEP)));
    }
    return dirs;
  }
  function get_dir_name(svg_obj, dir) {
    return svg_obj.getElementById(dir.id.replace(ID_PREFIX, TEXT_PREFIX)).dataset['text'];
  }
  function get_abs_dir_name(svg_obj, dir) {
    let path = dir.id.split(ID_SEP);
    let route = [];
    for (let i=1; i<path.length; i++) {
      let d_id = path.slice(0,i+1).join(ID_SEP);
      route.push(get_dir_name(svg_obj, svg_obj.getElementById(d_id)));
    }
    return route.join("/").replace("//", "/");
  }
  function get_path_from_dir(svg_obj, dir) {
    return svg_obj.getElementById(dir.id.replace(ID_PREFIX, PATH_PREFIX));
  }
  function populate_dir_quantities(qty_parent, qty_current, qty_subdir){
    dir_elements["key-parent-path"].setAttributeNS(null, 'style', "--dirfill:" + COL_PARENT + ";--dirstroke:" + (qty_parent? COL_STROKE_MAJOR:COL_STROKE_MINOR));
    dir_elements["key-current-path"].setAttributeNS(null, 'style', "--dirfill:" + COL_FROM + ";--dirstroke:" + (qty_current? COL_STROKE_MAJOR:COL_STROKE_MINOR));
    dir_elements["key-subdir-path"].setAttributeNS(null, 'style', "--dirfill:" + COL_SUBDIR + ";--dirstroke:" + (qty_subdir? COL_STROKE_MAJOR:COL_STROKE_MINOR));
    dir_elements["qty-parent"].innerHTML = "&nbsp;×&nbsp;" + qty_parent;
    dir_elements["qty-current"].innerHTML = "&nbsp;×&nbsp;" + qty_current;
    dir_elements["qty-subdir"].innerHTML = "&nbsp;×&nbsp;" + qty_subdir;
  }

  let svgObject = svgElement.contentDocument;
  dirs  = svgObject.getElementsByTagName("use");
  paths = svgObject.getElementsByClassName("path");
  texts = svgObject.getElementsByClassName("text");
  // may be undefined if not used:
  path_display = document.getElementById(PATH_DISPLAY_NAME);
  from_display = document.getElementById(FROM_DISPLAY_NAME);
  to_display = document.getElementById(TO_DISPLAY_NAME);
  
  if (interaction_type === TYPE_PARENT){
    dir_elements = {
      "key-parent-path": document.getElementById("key-dir-parent").contentDocument.getElementsByTagName("path")[0],
      "key-current-path": document.getElementById("key-dir-current").contentDocument.getElementsByTagName("path")[0],
      "key-subdir-path": document.getElementById("key-dir-subdir").contentDocument.getElementsByTagName("path")[0],
      "qty-parent": document.getElementById("qty-dir-parent"),
      "qty-current": document.getElementById("qty-dir-current"),
      "qty-subdir": document.getElementById("qty-dir-subdir")
    }
    populate_dir_quantities(0,0,0);
    let subdirs = {};
    for (let d of dirs) {
      let path = d.id.split(ID_SEP);
      if (path[0] === ID_PREFIX) {
        subdirs[d.id] = [];
        let subdir, i = 0;
        while (subdir = svgObject.getElementById([d.id, i].join(ID_SEP))) {
           subdirs[d.id].push(subdir);
           i++;
        }
        d.addEventListener("click", function(){
          let qty_parents = 0;
          let parent_id = this.id.split(ID_SEP).slice(0,-1).join(ID_SEP);
          for (let d of dirs) {
            let fill_color = COL_DEFAULT;
            let stroke_color = COL_STROKE_MINOR;
            if (d.id === parent_id) {
              stroke_color = COL_STROKE_MAJOR;
              fill_color = COL_PARENT;
              qty_parents++;
            } else if (d.id === this.id) {
              stroke_color = COL_STROKE_MAJOR;
              fill_color = COL_FROM;
            }
            d.setAttributeNS(null, 'style', "--dirfill:" + fill_color + "; --dirstroke:" + stroke_color);
          }
          for (let d of subdirs[this.id]) {
            d.setAttributeNS(null, 'style',  "--dirfill:"+COL_SUBDIR + ";--dirstroke:" + COL_STROKE_MAJOR);
          }
          populate_dir_quantities(qty_parents, 1, subdirs[this.id].length);
        })
      } // else ignore: doesn't start with expected prefix
    }
    return; // end of parental set-up
  }
  let final_path = "&nbsp;";
  for (let d of dirs) {
    d.addEventListener("click", function(){
      for (let d of dirs) {
        d.setAttributeNS(null, 'style',  "--dirfill:" + COL_DEFAULT);
      }
      for (let t of texts) {
        t.setAttributeNS(null, 'style',  "--textfill:" + COL_TEXT_DEFAULT);
      }
      for (let path of paths) {
        path.setAttributeNS(null, 'style', "opacity: 0");
      }
      let from_dir, from_route, to_route;

      if (interaction_type === TYPE_RELATIVE) {
        if (want_new_from_dir) { // this is setting a new input directory
          from_dir_id = this.id;
        }
        want_new_from_dir = !want_new_from_dir; // toggle
        from_dir = svgObject.getElementById(from_dir_id);
        from_route = get_dir_array(svgObject, from_dir_id);
        to_route = get_dir_array(svgObject, this.id);
        
        // run down from the two absolute paths, finding the first
        // place where the paths deviate

        let route_nodes = [];
        let route_paths = [];
        let route_names = ["."];
        let i = 0;
        done = from_dir_id === this.id;
        while (! done) {
          done = true;
          if (i >= from_route.length) { // to is below from
            for (let d of to_route.slice(i)) {
              route_nodes.push(d);
              route_paths.push(get_path_from_dir(svgObject, d));
              route_names.push(get_dir_name(svgObject, d));
            }
          } else if (
             (i >= to_route.length) // to is above from
             || (from_route[i] != to_route[i]) // diverges at i
            ) { 
            route_nodes = from_route.slice(i-1).slice(0, -1);
            route_paths.push(get_path_from_dir(svgObject, from_dir));
            for (let d of route_nodes.slice(1)){
              route_paths.push(get_path_from_dir(svgObject, d));
            }
            route_names = new Array(route_nodes.length);
            route_names.fill("..");
            if (from_route[i] != to_route[i]) {
              for (let d of to_route.slice(i)) {
                route_nodes.push(d);
                route_paths.push(get_path_from_dir(svgObject, d));
                route_names.push(get_dir_name(svgObject, d));
              }
            }
          } else {
            i++;
            done = false;
          }
        }
        for (let d of route_nodes) {
          d.setAttributeNS(null, 'style',  "--dirfill:" + COL_ON_PATH);
          svgObject.getElementById(d.id.replace(ID_PREFIX, TEXT_PREFIX)).setAttributeNS(null, 'style',  "--textfill:" + COL_TEXT_ON_PATH);
        }
        for (let p of route_paths) {
          p.setAttributeNS(null, 'style',  "opacity:1");
        }
        from_dir.setAttributeNS(null, 'style',  "--dirfill:" + COL_FROM);
        svgObject.getElementById(from_dir.id.replace(ID_PREFIX, TEXT_PREFIX)).setAttributeNS(null, 'style',  "--textfill:" + COL_TEXT_ON_PATH);
        from_display.innerHTML = get_abs_dir_name(svgObject, from_dir);
        to_display.innerHTML = get_abs_dir_name(svgObject, this);
        final_path = route_names.length? route_names.join("/") : "&nbsp;";
      } else if (interaction_type === TYPE_ABSOLUTE) {
        let dir_names = [];
        let steps = this.id.split(ID_SEP).slice(1);
        while (steps.length > 0) {
          let id = steps.join(ID_SEP);
          let d = svgObject.getElementById(ID_PREFIX + ID_SEP + id);
          d.setAttributeNS(null, 'style', "--dirfill:" + COL_CURRENT);
          let t = svgObject.getElementById(TEXT_PREFIX + ID_SEP + id);
          t.setAttributeNS(null, 'style', "--textfill:" + COL_TEXT_ON_PATH);
          if (steps.length > 1) {
            svgObject.getElementById(PATH_PREFIX + ID_SEP + id)
              .setAttributeNS(null, 'style',  "opacity: 1");
            dir_names.push(t.dataset['text']);
          }
          steps.pop();
        }
        final_path = "/"+dir_names.reverse().join("/");
      }
      path_display.innerHTML = final_path;
    })
  }
};

window.addEventListener("load", function() {
  let svgElement = document.getElementById('svg-dir-diagram');
  if (svgElement) { // only one interactive diagram per page, currently
    dir_interaction(svgElement);
  }
});
