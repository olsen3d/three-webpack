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
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

//DEBUG

const statsFPS = new Stats()
statsFPS.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( statsFPS.dom )

//MAIN

if (WEBGL.isWebGLAvailable()) {

  //VARIABLES

  let camera, scene, renderer
  let ingenuityController, shadowMesh, dustMesh
  let rotor1, rotor2


  //PRE-LOAD CONDITIONALS

  let isRendering = true
  let modelReady = false
  let isHovering = false

  ScrollTrigger.create({
  id: 'heroTHREE',
  trigger: '#THREEContainer',
  start: 'center top',
  end: 'bottom top',
  onEnterBack: () => {
    isRendering = true
    renderLoop()
  },
  onLeave: () => {isRendering = false},
  markers: true
})

  //INITIALIZE THREE

  function init() {

    //CAMERA
    camera = new THREE.PerspectiveCamera(
      50, //65
      window.innerWidth / (window.innerHeight * 0.8),
      1,
      240000
    )
    camera.position.set(0, 350, 1000)
    camera.lookAt(0, 350, 0)

    //SCENE
    scene = new THREE.Scene()

    //FOG
    {
      const near = -50000;
      const far = 220000;
      const color = 0xd9c6bb;
      scene.fog = new THREE.Fog(color, near, far);
    }




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

    const textureINGENUITY = loaderTEXTURE.load('../static/textures/INGENUITY_TEXTURE_BAKED_02.jpg')
    const textureROCKS = loaderTEXTURE.load('../static/textures/TERRAIN_TEXTURE_03.jpg')
    const textureShadow = loaderTEXTURE.load('../static/textures/shadowMask4.jpg')

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
    loaderGLTF.load( '../static/models/terrainDraco2.gltf', function ( gltf ) {
      var terrain = gltf.scene;
      terrain.matrixAutoUpdate = false
      terrain.scale.set(1.25, 1.25, 1.25)
      terrain.position.y = 0
      terrain.traverse((o) => {
        if (o.isMesh) o.material = terrainMat;
        // if (o.isMesh) o.material = new THREE.MeshNormalMaterial()
      });
      scene.add( terrain );
    }, undefined, function ( error ) {
      console.error( error );
    } )


    const testPlane = new THREE.PlaneGeometry(1200, 400, 0)

    const video = document.getElementById('video')
    video.play()
    const videoTexture = new THREE.VideoTexture(video);
    //80593c
    //9f7248
    const videoMaterial =  new THREE.MeshBasicMaterial( 
      {
        color: 0x9f7248, 
        alphaMap: videoTexture, 
        transparent: true,
        fog: false,
        depthWrite: false, 
        depthTest: false
      } );

    const testMat = new THREE.MeshNormalMaterial()
    dustMesh = new THREE.Mesh(testPlane, videoMaterial)
    dustMesh.position.y = 120
    dustMesh.rotation.y = THREE.Math.degToRad(0)
    scene.add(dustMesh)

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
    shadowMesh.rotation.x = THREE.Math.degToRad(-90)
    shadowMesh.position.y = -120
    scene.add(shadowMesh)


    //RENDERER
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setPixelRatio(1)
    renderer.setSize(window.innerWidth, window.innerHeight * 0.8)
    const container = document.getElementById( 'THREEContainer' )
    container.appendChild(renderer.domElement)

    //scene.overrideMaterial = new THREE.MeshNormalMaterial()
    //window.devicePixelRatio for high res displays

  }

  //EVENT LISTENERS
  function onWindowResize() {
    camera.aspect = 720 / 480
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight * 0.8)
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
    normal: 80,
    normalMax: 300,
    hoverAmount: 0,
    mouseAmount: 0,
    hoverMin: 10,
    hoverMax: 25,
    mouseMax: 180,
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
      shadowMesh.position.x = ingenuityController.position.x + -120
      dustMesh.position.x = ingenuityController.position.x
      shadowMesh.position.z = hoverHeight.currentX() - 150
      updateRotors()
    }
    if (modelReady && inFlight) {
      updateCamera()
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
