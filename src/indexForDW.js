/* eslint-disable */


/*

MARS INGENUITY - Interactive semi-realtime rendering with webGL - HTML, Javascript, THREE.js, GreenSock Animation Platform 
View at: marsingenuity.onrender.com

The problem:
  I wanted to render a model and environment in realtime for the web. However I wanted it to be accessable to a wide
  audience on a wide range of devices. That means no real time lighting, that would be too gpu intensive for low end
  devices. The models and textures have to be efficient otherwise the load time can skyrocket - initially I had 3 
  OBJ models and several textures that easily set the page load download size to > 40MB, which is unnacceptable
  on slow internet or over 3G etc. 

The solution:
  I developed a pipeline between 3dsmax and my code here to bake the lighting of my scene in 3dsmax/corona. In excahnge 
  for an hour of cpu rendering on my machine each time the model is updated we save the user a ton of gpu resources.
  The lighting is baked into the diffuse maps so all we have to download is 2 4096x4096 texture maps and 2 models. The
  models are compressed with Googles Draco 3D compression which substantially lowered the size from 25MB to less than 2MB
  in exchange for slightly longer processing time.

The outcome:
  I think I found a really good balance between a render that looks good in real time and doesn't use more resources than
  a low end macbook air, or a last gen smartphone can handle (averaging 50+ fps)

*/

//import webGL
import { WEBGL } from './webgl'
//import THREE.js
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js'
//import greensock
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

//make sure the user has webGL available (pretty much all browsers should now)
if (WEBGL.isWebGLAvailable()) {

  //variables to store scene objects
  let camera, scene, renderer
  let ingenuityController, rotor1, rotor2
  let shadowMesh, dustMesh
  //pre-load conditional checks
  let isRendering = true
  let modelReady = false
  let isHovering = false

  //initialize THREE and everything in the scene that we need to get started
  function init() {

    //create the CAMERA with 50 degrees FOV, aspect ratio, near, and far frustrum plane. - this camera matches my
    //3ds max camera FOV and position
    camera = new THREE.PerspectiveCamera(
      50, //65
      window.innerWidth / (window.innerHeight * 0.8),
      1,
      240000
    )
    camera.position.set(0, 350, 1000)
    camera.lookAt(0, 350, 0)

    //create the scene
    scene = new THREE.Scene()

    //create fog - this fog color matches the color in 3dsmax
    {
      const near = -50000;
      const far = 220000;
      const color = 0xd9c6bb;
      scene.fog = new THREE.Fog(color, near, far);
    }

    //load materials and textures
    let rt, hybridMat, terrainMat
    const loaderTEXTURE = new THREE.TextureLoader();

    //load the background HDRI. The supplied callback then transforms the spherical HDRI into a cubemap
    //to use for real time reflections
    const textureBG = loaderTEXTURE.load(
      '../static/textures/bg.jpg',
      () => {
        rt = new THREE.WebGLCubeRenderTarget(textureBG.image.height);
        rt.fromEquirectangularTexture(renderer, textureBG);
        hybridMat.envMap = rt
        scene.background = rt;
      }
      )

    //load 2 main textures and a small shadow texture
    const textureINGENUITY = loaderTEXTURE.load('../static/textures/INGENUITY_TEXTURE_BAKED_02.jpg')
    const textureROCKS = loaderTEXTURE.load('../static/textures/TERRAIN_TEXTURE_03.jpg')
    const textureShadow = loaderTEXTURE.load('../static/textures/shadowMask4.jpg')

    //create materials
    terrainMat = new THREE.MeshBasicMaterial({
      map: textureROCKS,
      fog: true
    })

    hybridMat = new THREE.MeshBasicMaterial({
      color: 0xeeeeee,
      map: textureINGENUITY,
      specularMap: textureINGENUITY,
      reflectivity: 2,
      combine: THREE.AddOperation,
      fog: false
    })

    //create a main group control. This is similar to having everything under one parent node in 3dsmax
    //everything will be based off of this ingenuity controller
    ingenuityController = new THREE.Group()
    scene.add(ingenuityController)
    ingenuityController.rotation.y = 0.45
    ingenuityController.position.y = 50



    //load models
    const loaderGLTF = new GLTFLoader()
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( 'src/draco/' )
    loaderGLTF.setDRACOLoader( dracoLoader )

    //load Ingenuity model - the callback here traverses the model and sets the THREE material and sets the 
    //stores them in javascript variables to be animated later with GSAP
    loaderGLTF.load( '../static/models/ingDraco02.gltf', function ( gltf ) {
      const model = gltf.scene;
      model.scale.set(1.25, 1.25, 1.25)
      model.position.y = -50
      scene.add( model );
      ingenuityController.add(model)
      model.traverse((o) => {
        if (o.isMesh) o.material = hybridMat;
        if (o.name === 'rotor1') rotor1 = o
        if (o.name === 'rotor2') rotor2 = o
      })

      modelReady = true
    }, undefined, function ( error ) {
      console.error( error );
    } )

    //Load the terrain model
    loaderGLTF.load( '../static/models/terrainDraco2.gltf', function ( gltf ) {
      const terrain = gltf.scene;
      //this sets the model to not update every frame since the terrain is static and doesnt move
      terrain.matrixAutoUpdate = false
      terrain.scale.set(1.25, 1.25, 1.25)
      terrain.position.y = 0
      terrain.traverse((o) => {
        if (o.isMesh) o.material = terrainMat;
      });
      scene.add( terrain );
    }, undefined, function ( error ) {
      console.error( error );
    } )

    //create the plane geometry for the shadow that will slide along the ground underneath ingenuity
    //simulating a realtime shadow
    const shadowPlane = new THREE.PlaneGeometry(1400, 1400, 10, 10)
    const shadowMat = new THREE.MeshBasicMaterial(
      {
        color: 0x000000,
        alphaMap: textureShadow,
        opacity: 0.7
        ,
        transparent: true,
        fog: false,
        depthWrite: false, 
        depthTest: false
      }
    )
    shadowMesh = new THREE.Mesh(shadowPlane, shadowMat)
    //THREE uses radians I like to work with degrees from 3dsmax so this converts it for me
    shadowMesh.rotation.x = THREE.Math.degToRad(-90)
    shadowMesh.position.y = -120
    scene.add(shadowMesh)


    //create a webGL renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(1)
    renderer.setSize(window.innerWidth, window.innerHeight * 0.8)
    //grab the container from my index.html
    const container = document.getElementById( 'THREEContainer' )
    container.appendChild(renderer.domElement)
  }

  //mouse event listener and handler. As the mouse position moves, store it in a vector for later use
  const mouse = new THREE.Vector2()
  function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  document.addEventListener('mousemove', onDocumentMouseMove, false);


  //object to help with keeping track of ingenuity's height. It has a baseline normal height, a looping hover height,
  //and the height can be influenced by the mouse's position on screen
  let hoverHeight = {
    normal: 80,
    normalMax: 300,
    hoverAmount: 0,
    mouseAmount: 0,
    hoverMin: 10,
    hoverMax: 25,
    mouseMax: 180,
    //method to calculate and return the current height - this will be called on every update in the render loop
    currentX: function() {
      return this.normal + this.hoverAmount + this.mouseAmount
    }
  }

  //this next section is a series of functions to animate ingenuity. I used GSAP with ease bezier curves to better show the
  //weight of the object.
  const maxHorizontalPosition = 1000
  const updateHoverMousePosition = () => {
    gsap.to(ingenuityController.position, { duration: 5, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
    gsap.to(hoverHeight, { duration: 5, ease: 'power2.out', mouseAmount: mouse.y * hoverHeight.mouseMax })
  }

  const updateHoverMouseRotation = () => {
    const distance = (mouse.x * maxHorizontalPosition) - ingenuityController.position.x
    //this rotates ingenuity more the further away it is from its goal position (which is the current mouse position)
    ingenuityController.rotation.z = THREE.Math.degToRad(distance / -40)
  }

  const takeOff = () => {
    gsap.to(hoverHeight, { duration: 2, ease: 'power1.inOut', normal: hoverHeight.normalMax })
    gsap.to(ingenuityController.rotation, { duration: 4, ease: 'back.inOut(4)', y: 0 })
  }

  //a looping hover animation that moves ingenuity a random amount each time. It set up wo run continuosly
  //in a setInterval
  const hover = () => {
    isHovering = true
    let isUp = false
    let amount = (Math.random() * hoverHeight.hoverMax) + hoverHeight.hoverMin

    const updateHoverVerticalPosition = (_amount) => {
      gsap.to(hoverHeight, { duration: 4, ease: 'back.inOut(4)', hoverAmount: _amount })
    }

  window.setInterval(() => {
    isUp = !isUp
    if (isUp) {
      amount = (Math.random() * hoverHeight.hoverMax) + hoverHeight.hoverMin
    } else {
      amount = -amount
    }
    updateHoverVerticalPosition(amount)
  }, 4000)
}

  //animate the camera to follow ingenuity across the screen
  const updateCamera = () => {
    const maxRotation = 350
    gsap.to(camera.rotation, { duration: 7, ease: 'power1.out', y: mouse.x * maxRotation * 0.001 * -1 })
  }

  //constantly rotate the rotors every frame. reset once you hit 360 degrees to avoid the numbers going to high 
  const updateRotors = () => {
    if (rotor1.rotation.y > 360) rotor1.rotation.y = 0
    if (rotor2.rotation.y > 360) rotor2.rotation.y = 0
    rotor1.rotation.y += 0.3 //0.3
    rotor2.rotation.y -= 0.4 //0.4
  }

  //post load conditional statements
  let startTakeOff = false
  let inFlight = false

  //this is our main update function this will get called on every new frame (ideally 60fps depending on the user's
  //device, see below for the render loop)
  const update = () => {
    //make sure the model is loaded, and before it has taken off - start the takeoff and hover sequences and 
    //set inFlight. 
    if (modelReady && !startTakeOff) {
      setTimeout(() => {startTakeOff = true}, 1000)
      setTimeout(() => {inFlight = true}, 2000)
      takeOff()
      if (!isHovering) hover()
    }

    //this calls the method on the hoverHeight every frame to calculate where igenuity should currently be
    ingenuityController.position.y = hoverHeight.currentX()

    //updates the position of the shadow plane and updates the rotation of the spinning rotors
    if (modelReady) {
      shadowMesh.position.x = ingenuityController.position.x + -120
      shadowMesh.position.z = hoverHeight.currentX() - 150
      updateRotors()
    }

    //once in flight let the camera follow ingenuity and activate the mouse movement controls
    if (modelReady && inFlight) {
      updateCamera()
      updateHoverMouseRotation()
      updateHoverMousePosition()
    }
  }

  //this is the main render loop. It will call itself infinitely to render each frame. Calling a 
  //requestAnimationFrame (RAF) each time will make sure that A. the animation is non-blocking and the
  //browser will perform the callback before the next repaint and B. the loop is capped at 60fps (or
  // whatever the refresh rate is of the screen, usually 60fps)
  const render = () => renderer.render(scene, camera)
  const renderLoop = () => {
    //by default the RAF will stop rendering when the tab is in the background but we have a second THREE scene
    //further down so when we scroll past this scene it will stop rendering
    if (isRendering) {
      update()
      render()
      requestAnimationFrame( renderLoop )
    }
  }

  init()
  renderLoop()

} else {
  var warning = WEBGL.getWebGLErrorMessage()
  document.body.appendChild(warning)
}
