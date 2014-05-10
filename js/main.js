var Citation = require('citation');

var demoInput = document.getElementById('demo-input');
var demoOutput = document.getElementById('demo-output');
demoInput.onkeyup = update;

update();

var ex = document.getElementsByClassName('ex');

for (var i = 0; i < ex.length; i++) {
    ex[i].onclick = function() {
        demoInput.value = this.dataset.ex;
        update();
        for (var i = 0; i < ex.length; i++) {
            if (ex[i] !== this) {
                ex[i].classList.add('active');
            } else {
                ex[i].classList.remove('active');
            }
        }
    };
}

ex[0].onclick();

function update() {
    demoOutput.innerHTML = JSON.stringify(Citation.find(demoInput.value), null, 2);
}
