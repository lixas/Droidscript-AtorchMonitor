var dragging = null;

document.addEventListener('dragstart', function(event) {
    var target = getLI( event.target );
    dragging = target;
    event.dataTransfer.setData('text/plain', null);
    event.dataTransfer.setDragImage(self.dragging,100,0);
});

document.addEventListener('dragover', function(event) {
    event.preventDefault();
    var target = getLI( event.target );
    var bounding = target.getBoundingClientRect()
    var offset = bounding.y + (bounding.height/2);
    if ( event.clientY - offset > 0 ) {
       	target.style['border-bottom'] = 'solid 4px blue';
        target.style['border-top'] = '';
    } else {
        target.style['border-top'] = 'solid 4px blue';
        target.style['border-bottom'] = '';
    }
});

document.addEventListener('dragleave', function(event) {
    var target = getLI( event.target );
    target.style['border-bottom'] = '';
    target.style['border-top'] = '';
});

document.addEventListener('drop', function(event) {
    event.preventDefault();
    var target = getLI( event.target );
    if(target.nodeName.toLowerCase() != "li"){
        return
    }
    if ( target.style['border-bottom'] !== '' ) {
        target.style['border-bottom'] = '';
        target.parentNode.insertBefore(dragging, event.target.nextSibling);
    } else {
        target.style['border-top'] = '';
        target.parentNode.insertBefore(dragging, event.target);
    }
});

function getLI( target ) {
    if ( target.nodeName.toLowerCase() == "body") {
        return false;
    } else {
        return target;
    }

}

function getSortedList(){
    var results = Array();
    var childrens = document.getElementById("my-list").children;
    for (let i = 0; i < childrens.length; i++) {
        results.push({
            "index":i,
            "key":childrens[i].getAttribute("data-identity"),
            "checked": childrens[i].children[0].checked,
			"title": childrens[i].children[0].getAttribute("data-title")
            })
    }
    return results;
}

function buildmenu(mnu){
    // <li draggable="true" data-identity="1"><input type="checkbox">List Item 1</li>
    var par = document.getElementById("my-list")
	if(mnu){
		for (let i = 0; i < mnu.length; i++) {
			var isChecked = (mnu[i].checked) ? 'checked' : ''
			par.innerHTML += "<li draggable=\"true\" data-identity=\""+ mnu[i].key +"\"><input data-title=\""+ mnu[i].title +"\" type=\"checkbox\" "+ isChecked +">"+ mnu[i].title +"</li>"
		}
	}
    return "buildmenu finished"
}

function getContentSize(){
    return document.getElementById("my-list").scrollHeight
}
