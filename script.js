let red = '#ba1f1f';
let storedData = {}; 

document.addEventListener('DOMContentLoaded', () => {
        // load json
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            storedData = data;
            console.log("資料載入成功");
        })
        .catch(err => console.error('讀取 JSON 失敗:', err));
    
    const loginBtn = document.getElementById('login-btn');
    const passInput = document.getElementById('passcode');
    
    if(loginBtn) {
        loginBtn.addEventListener('click', checkPass);
    }
    if(passInput) {
        passInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') checkPass();
        });
    }
});

// check password
function checkPass() {
    const inputPass = document.getElementById('passcode').value.toUpperCase().trim();
    const keyName = inputPass.toLowerCase(); // 用小寫當 key
    
    const errorMsg = document.getElementById('error-msg');
    const container = document.getElementById('mailbox-container'); 
    const paperTexture = document.querySelector('.paper-texture'); 
    const loginUI = document.querySelector('.login-container') || document.getElementById('login-interface');

    // // testing
    // if (inputPass === "OPEN") {
    //     if(errorMsg) errorMsg.style.display = 'none';
    //     hideUI();
    //     init3D("Testing！\nWhat a surprise！", "test", "No Address"); 
    //     return; 
    // }

    if (storedData[keyName]) {
        try {
            const userData = storedData[keyName];
            let decryptedMsg = "";
            let decryptedAddr = "";

            // decode content
            if (userData.msg) {
                const bytes = CryptoJS.AES.decrypt(userData.msg, keyName);
                decryptedMsg = bytes.toString(CryptoJS.enc.Utf8);
            }

            // decode add
            if (userData.addr && userData.addr !== "") {
                try {
                    const bytesAddr = CryptoJS.AES.decrypt(userData.addr, keyName);
                    decryptedAddr = bytesAddr.toString(CryptoJS.enc.Utf8);
                } catch(e) { decryptedAddr = ""; }
            }

            if (decryptedMsg) {
                if(errorMsg) errorMsg.style.display = 'none';
                hideUI();
                
                // send
                init3D(decryptedMsg, inputPass, decryptedAddr);
            } else {
                showError();
            }
        } catch (e) {
            console.error(e);
            showError();
        }
    } else {
        // wrong name
        showError();
    }

    function showError() {
        if(errorMsg) errorMsg.style.display = 'block';
    }

    function hideUI() {
        if(container) container.style.display = 'none'; 
        if(paperTexture) paperTexture.style.display = 'none';
        
        // hide login
        if(loginUI) loginUI.style.display = 'none';
        document.getElementById('passcode').style.display = 'none';
        if(document.getElementById('login-btn')) document.getElementById('login-btn').style.display = 'none';
        const h1 = document.querySelector('h1');
        if(h1) h1.style.display = 'none';
    }
}

// postcard
function init3D(messageText, receiverName, address) {
    // scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xba1f1f);

    // camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 8;

    // renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // mouse
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    let autoRotate = true;
    controls.addEventListener('start', () => { autoRotate = false; });

    // image
    const textureLoader = new THREE.TextureLoader();
    const frontTexture = textureLoader.load('card_front.png'); 
    const geometry = new THREE.BoxGeometry(7, 5, 0.05);
    
    // word
    const backTexture = createTextTexture(messageText, receiverName, address);

    const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xeae4d3 });
    const materials = [
        edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial,
        new THREE.MeshBasicMaterial({ map: frontTexture }), 
        new THREE.MeshBasicMaterial({ map: backTexture }) 
    ];
    const card = new THREE.Mesh(geometry, materials);
    scene.add(card);

    function animate() {
        requestAnimationFrame(animate);
        
        if (autoRotate) {
            card.rotation.y += 0.003;
        }
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // wheel
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// text=>texture
function createTextTexture(text, name, address) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1750; 
    canvas.height = 1250;
    
    ctx.fillStyle = '#eae4d3'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = red;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width *0.6, 50);
    ctx.lineTo(canvas.width *0.6, canvas.height - 50);
    ctx.stroke();

    const lineYBase = 400;
    const lineSpacing = 80;

    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(canvas.width *0.6 + 50, lineYBase + i * lineSpacing); 
        ctx.lineTo(canvas.width - 50, lineYBase + i * lineSpacing);
        ctx.stroke();
    }
    
    // words
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'top';

    // name
    ctx.font = '50px "Chiron GoRound TC", sans-serif'; 
    ctx.textAlign = 'left';
    const displayName = name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "Friend";
    ctx.fillText("To: " + displayName, canvas.width *0.6 + 60, 345);

    // your address
if (address) {
        ctx.font = '40px "Chiron GoRound TC", sans-serif'; 
        
        const maxAddrWidth = (canvas.width * 0.4) - 110; 
        const addrX = canvas.width * 0.6 + 60;
        
        const rawAddrLines = address.split('\n');
        let finalAddrLines = [];
        rawAddrLines.forEach(paragraph => {
            let line = '';
            const words = paragraph.split(''); 
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n];
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxAddrWidth && n > 0) {
                    finalAddrLines.push(line);
                    line = words[n];
                } else {
                    line = testLine;
                }
            }
            finalAddrLines.push(line);
        });
        finalAddrLines.forEach((line, index) => {
            const yPos = lineYBase + (index * lineSpacing) +30; 
            ctx.fillText(line, addrX, yPos);
        });
    }

    // my address
    ctx.font = '25px "Chiron GoRound TC", sans-serif'; 
    ctx.fillStyle = '#626262ff';
    const myAddress = "From: Yu Fang Lai\n111 Lawrence St., Brooklyn, NY11201, USA";
    const addressLines = myAddress.split('\n');
    addressLines.forEach((line, index) => {
        ctx.fillText(line, canvas.width *0.6 + 60, 700 + index * 35);
    });

    // content
    ctx.fillStyle = '#000000ff';
    ctx.font = '36px "Chiron GoRound TC", sans-serif'; 
    ctx.textAlign = 'left';
    
    const maxBodyWidth = (canvas.width * 0.6) - 100;
    const lineHeight = 80;
    const bodyStartX = 50;
    
    // count lines
    const paragraphs = text.replace(/\\n/g, '\n').split('\n');
    let linesToDraw = [];

    paragraphs.forEach(paragraph => {
        let line = '';
        const words = paragraph.split(''); 
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n];
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxBodyWidth && n > 0) {
                linesToDraw.push(line);
                line = words[n];
            } else {
                line = testLine;
            }
        }
        linesToDraw.push(line); 
    });

    const totalTextHeight = linesToDraw.length * lineHeight;
    let currentY = (canvas.height - totalTextHeight) / 2;
    // type in
    linesToDraw.forEach(line => {
        ctx.fillText(line, bodyStartX, currentY);
        currentY += lineHeight;
    });

    // stamp
    const texture = new THREE.CanvasTexture(canvas);
    const stampImg = new Image();
    
    const randomNum = Math.floor(Math.random() * 3) + 1; 
    stampImg.src = `stamp${randomNum}.png`; 
    stampImg.onload = function() {
        const stampX = canvas.width - 300;
        const stampY = 40;
        const stampWidth = 260;
        const stampHeight = 295;
        
        ctx.drawImage(stampImg, stampX, stampY, stampWidth, stampHeight);
        
        // stamp postmark
        ctx.beginPath();
        ctx.arc(stampX + 20, stampY + stampHeight-50, 70, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(50, 50, 50, 0.6)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        for(let w=0; w<3; w++) {
             ctx.beginPath();
             ctx.moveTo(stampX - 80, stampY + stampHeight - 40 + w*15);
             ctx.bezierCurveTo(
                 stampX - 40, stampY + stampHeight - 60 + w*15, 
                 stampX + 0, stampY + stampHeight - 20 + w*15, 
                 stampX + 40, stampY + stampHeight - 40 + w*15
             );
             ctx.stroke();
        }
        texture.needsUpdate = true;
    };

    return texture;
}