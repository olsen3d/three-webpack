/* eslint-disable no-multiple-empty-lines */
/* eslint-disable default-case */
/* eslint-disable no-inner-declarations */
/* eslint-disable max-statements */
import * as THREE from 'three'
import { WEBGL } from './webgl'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js'
import gsap from 'gsap'



//DEBUG

const statsFPS = new Stats()
statsFPS.showPanel( 3 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( statsFPS.dom )

//MAIN

if (WEBGL.isWebGLAvailable()) {

  //VARIABLES

  let camera, scene, renderer
  let ingenuityController
  let rotor1, rotor2


  //PRE-LOAD CONDITIONALS

  let isRendering = true
  let modelReady = false
  let isHovering = false

  //BUTTONS

  const renderButton = document.querySelector('#renderButton')
  renderButton.addEventListener('click', () => {
    if (isRendering) {
      isRendering = false

    } else {
      isRendering = true
      // eslint-disable-next-line no-use-before-define
      renderLoop()
    }
  })


  //INITIALIZE THREE

  function init() {

    //CAMERA
    camera = new THREE.PerspectiveCamera(
      65, //65
      window.innerWidth / window.innerHeight,
      1,
      380000
    )
    camera.position.set(0, 350, 1000)
    camera.lookAt(0, 350, 0)

    //SCENE
    scene = new THREE.Scene()

    //FOG
    {
      const near = -200000;
      const far = 250000;
      const color = 0xd9c6bb;
      scene.fog = new THREE.Fog(color, near, far);
    }

    //DEBUG MODELS AND HELPERS

    //MATERIALS AND TEXTURES LOADERS

    let rt, hybridMat, terrainMat

    const loaderTEXTURE = new THREE.TextureLoader();

    const textureBG = loaderTEXTURE.load(
      '../static/textures/bg9.jpg',
      () => {
        rt = new THREE.WebGLCubeRenderTarget(textureBG.image.height);
        rt.fromEquirectangularTexture(renderer, textureBG);
        hybridMat.envMap = rt
        scene.background = rt;
      }
      )

    const textureINGENUITY = loaderTEXTURE.load('../static/textures/INGENUITY_TEXTURE_BAKED_01.jpg')
    const textureTERRAIN = loaderTEXTURE.load('../static/textures/TERRAINBAKED01.jpg')

    terrainMat = new THREE.MeshBasicMaterial({
      map: textureTERRAIN,
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

    //GROUPS AND CONTROLLERS
    ingenuityController = new THREE.Group()
    scene.add(ingenuityController)
    ingenuityController.rotation.y = 0.45
    ingenuityController.position.y = 50

    //MODEL LOADERS

    const loaderGLTF = new GLTFLoader()
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( 'src/draco/' );
    loaderGLTF.setDRACOLoader( dracoLoader );

    //INGENUITY
    loaderGLTF.load( '../static/models/ingDraco02.gltf', function ( gltf ) {
      var model = gltf.scene;
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

    //TERRAIN
    loaderGLTF.load( '../static/models/terrainDraco.gltf', function ( gltf ) {
      var terrain = gltf.scene;
      terrain.scale.set(1.25, 1.25, 1.25)
      terrain.position.y = 0
      terrain.traverse((o) => {
        if (o.isMesh) o.material = terrainMat;
      });
      scene.add( terrain );
    }, undefined, function ( error ) {
      console.error( error );
    } )


    //RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    const container = document.getElementById( 'THREEContainer' )
    container.appendChild(renderer.domElement)

  }

  //EVENT LISTENERS
  function onWindowResize() {
    camera.aspect = 720 / 480
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onWindowResize, false)

  const mouse = new THREE.Vector2()
  function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  document.addEventListener('mousemove', onDocumentMouseMove, false);


  //INGENUITY FUNCTIONALITY
  let hoverHeight = {
    normal: 100,
    normalMax: 300,
    hoverAmount: 0,
    mouseAmount: 0,
    hoverMin: 10,
    hoverMax: 25,
    mouseMax: 150,
    currentX: function() {
      return this.normal + this.hoverAmount + this.mouseAmount
    }
  }

  const maxHorizontalPosition = 1000
  const updateHoverMousePosition = () => {
    gsap.to(ingenuityController.position, { duration: 5, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
    gsap.to(hoverHeight, { duration: 5, ease: 'power2.out', mouseAmount: mouse.y * hoverHeight.mouseMax })
  }

  const updateHoverMouseRotation = () => {
    const distance = (mouse.x * maxHorizontalPosition) - ingenuityController.position.x
    ingenuityController.rotation.z = THREE.Math.degToRad(distance / -40)
  }

  const takeOff = () => {
    gsap.to(hoverHeight, { duration: 2, ease: 'power1.inOut', normal: hoverHeight.normalMax })
    gsap.to(ingenuityController.rotation, { duration: 4, ease: 'back.inOut(4)', y: 0 })
  }

  const hover = () => {
    isHovering = true
    let isUp = false
    let amount = (Math.random() * hoverHeight.hoverMax) + hoverHeight.hoverMin

    const updateHoverVerticalPosition = (_amount) => {
      gsap.to(hoverHeight, { duration: 4, ease: 'back.inOut(4)', hoverAmount: _amount })
    }

  window.setInterval(() => {
    console.log('interval')
    isUp = !isUp
    if (isUp) {
      amount = (Math.random() * hoverHeight.hoverMax) + hoverHeight.hoverMin
    } else {
      amount = -amount
    }
    updateHoverVerticalPosition(amount)
  }, 4000)
}

  const updateCamera = () => {
    const maxRotation = 350
    gsap.to(camera.rotation, { duration: 7, ease: 'power1.out', y: mouse.x * maxRotation * 0.001 * -1 })
  }

  const updateRotors = () => {
    if (rotor1.rotation.y > 360) rotor1.rotation.y = 0
    if (rotor2.rotation.y > 360) rotor2.rotation.y = 0
    rotor1.rotation.y += 0.3 //0.3
    rotor2.rotation.y -= 0.4 //0.4
  }



  //POST-LOAD CONDITIONALS

  let startTakeOff = false
  let inFlight = false

  //UPDATE
  const update = () => {
    if (modelReady && !startTakeOff) {
      setTimeout(() => {startTakeOff = true}, 1000)
      setTimeout(() => {inFlight = true}, 2000)
      takeOff()
      if (!isHovering) hover()
    }

    ingenuityController.position.y = hoverHeight.currentX()

    if (modelReady) {
      updateRotors()
    }
    if (modelReady && inFlight) {
      updateCamera()
      //updateBG()
      updateHoverMouseRotation()
      updateHoverMousePosition()
    }
  }

  //RENDER LOOP
  const render = () => renderer.render(scene, camera)
  const renderLoop = () => {
    if (isRendering) {
      statsFPS.begin()
      update()
      render()
      statsFPS.end()
      requestAnimationFrame( renderLoop )
    }
  }

  init()
  renderLoop()

} else {
  var warning = WEBGL.getWebGLErrorMessage()
  document.body.appendChild(warning)
}
