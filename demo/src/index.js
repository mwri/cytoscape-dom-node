import cytoscape from 'cytoscape';
import cytoscapeCoseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeDomNode from 'cytoscape-dom-node';
import html2canvas from 'html2canvas';

cytoscape.use(cytoscapeCoseBilkent);
cytoscape.use(cytoscapeDomNode);


function entry (cy_dom_el) {
    let cy = cytoscape({
        'container': cy_dom_el,
        'elements': [],
        'style': [{
            'selector': 'node',
            'style': {
            'background-opacity': 0,
            },
        }],
    });

    // enable extension for instance

    cy.domNode();

    // run the layout

    function layout() {
        cy.layout({
            'name':      'cose-bilkent',
            'randomize': false,
        }).run();
    }

    // return a definition for a new node, with randomly sized DOM
    // element to make it more interesting

    function cy_node_def (label, rp) {
        let id = `n${cy.nodes().length}`;
        let div = document.createElement("div");
        div.innerHTML = `node ${id}`;
        div.classList = ['my-cy-node'];
        div.style.width = `${Math.floor(Math.random() * 40) + 60}px`;
        div.style.height = `${Math.floor(Math.random() * 30) + 50}px`;

        return {
            'data': {
                'id': id,
                'label': label || `n${cy.nodes().length}`,
                'dom': div,
            },
            'renderedPosition': rp,
        };
    }

    // add the first node

    cy.add(cy_node_def());
    layout();

    let last_added_id    = 'n0';
    let last_extended_id = 'n0';

    // add another node every 2 seconds

    let interval = setInterval(() => {
        let action = Math.floor(Math.random() * 8);

        let cy_n_id = action == 0
            ? cy.nodes()[Math.floor(Math.random() * cy.nodes().length)].id()
            : action < 5
            ? last_added_id
            : last_extended_id;

        let cy_n = cy.getElementById(cy_n_id);

        let new_n_cydef = cy_node_def(undefined, cy_n.renderedPosition());
        let new_n_id    = new_n_cydef.data.id;
        let new_e_cydef = {'data': {'id': new_n_id + '_' + cy_n_id, 'source': new_n_id, 'target': cy_n_id}};

        cy.add(new_n_cydef);
        cy.add(new_e_cydef);

        last_added_id    = new_n_id;
        last_extended_id = cy_n_id;

        layout();
    }, 2000);

    setTimeout(function () {
        clearInterval(interval);
    }, 60000);

    return cy;
}


async function snapshot (target_dom_el) {
    let canvas = await html2canvas(target_dom_el);
    let url = canvas.toDataURL("image/jpeg");

    return url;
}


export {
    entry as default,
    snapshot as snapshot,
};
