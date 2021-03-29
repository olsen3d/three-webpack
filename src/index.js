/* eslint-disable no-multiple-empty-lines */
/* eslint-disable default-case */
/* eslint-disable no-inner-declarations */
/* eslint-disable max-statements */
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

//DEBUG

//MAIN

  //VARIABLES

  let heroCamera, heroScene, heroRenderer
  let ingenuityController, shadowMesh, dustMesh, dustMesh2
  let rotor1, rotor2


  //PRE-LOAD CONDITIONALS

  let isHeroRendering = true
  let modelReady = false
  let isHovering = false

  ScrollTrigger.create({
  id: 'heroTHREE',
  trigger: '#THREEContainer',
  start: 'center top',
  end: 'bottom top',
  onEnterBack: () => {
    isHeroRendering = true
    renderLoop()
  },
  onLeave: () => {isHeroRendering = false},
  markers: false
})

  //INITIALIZE THREE

  function init() {

    //CAMERA
    heroCamera = new THREE.PerspectiveCamera(
      50, //65
      window.innerWidth / (window.innerHeight * 0.8),
      1,
      2400
    )
    heroCamera.position.set(0, 350, 1000)
    heroCamera.lookAt(0, 350, 0)

    //SCENE
    heroScene = new THREE.Scene()




    //MATERIALS AND TEXTURES LOADERS

    let rt, hybridMat

    const loaderTEXTURE = new THREE.TextureLoader();

    const textureBG = loaderTEXTURE.load(
      '../static/textures/herobg1.jpg',
      () => {
        rt = new THREE.WebGLCubeRenderTarget(textureBG.image.height);
        rt.fromEquirectangularTexture(heroRenderer, textureBG);
        hybridMat.envMap = rt
        heroScene.background = rt;
      }
      )

    const textureINGENUITY = loaderTEXTURE.load('../static/textures/INGENUITY_TEXTURE_BAKED_02.jpg')
    const textureShadow = loaderTEXTURE.load('../static/textures/shadowMask4.jpg')
    const textureDust = loaderTEXTURE.load('../static/textures/dust.jpg')


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
    heroScene.add(ingenuityController)
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
      heroScene.add( model );
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


    const testPlane = new THREE.PlaneGeometry(1000, 300, 0)

    const video = document.getElementById('dustVideo')
    video.play()
    const videoTexture = new THREE.VideoTexture(video);

    const videoMaterial =  new THREE.MeshBasicMaterial(
      {
        map: textureDust,
        alphaMap: videoTexture,
        opacity: 0.75,
        transparent: true,
        fog: false,
        depthWrite: false,
        depthTest: false
      }
    )

    dustMesh = new THREE.Mesh(testPlane, videoMaterial)
    dustMesh.position.y = 200
    dustMesh.position.z = 200
    dustMesh.rotation.y = THREE.Math.degToRad(0)
    dustMesh.rotation.y = THREE.Math.degToRad(15)
    heroScene.add(dustMesh)

    dustMesh2 = new THREE.Mesh(testPlane, videoMaterial)
    dustMesh2.position.y = 200
    dustMesh2.position.z = 200
    dustMesh2.rotation.y = THREE.Math.degToRad(0)
    dustMesh2.rotation.y = THREE.Math.degToRad(-15)
    heroScene.add(dustMesh2)

    const shadowPlane = new THREE.PlaneGeometry(1400, 1400, 10, 10)
    const shadowMat = new THREE.MeshBasicMaterial(
      {
        color: 0x000000,
        alphaMap: textureShadow,
        opacity: 0.7,
        transparent: true,
        fog: false,
        depthWrite: false,
        depthTest: false
      }
    )
    shadowMesh = new THREE.Mesh(shadowPlane, shadowMat)
    shadowMesh.rotation.x = THREE.Math.degToRad(-90)
    shadowMesh.position.y = -120
    heroScene.add(shadowMesh)


    //RENDERER
    heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    heroRenderer.setPixelRatio(1)
    heroRenderer.setSize(window.innerWidth, window.innerHeight * 0.8)
    const container = document.getElementById( 'THREEContainer' )
    container.appendChild(heroRenderer.domElement)

  }



  //EVENT LISTENERS
  function onWindowResize() {
    // heroCamera.aspect = 720 / 480
    heroCamera.aspect = window.innerWidth / (window.innerHeight * 0.8)
    heroCamera.updateProjectionMatrix()
    heroRenderer.setSize(window.innerWidth, window.innerHeight * 0.8)
  }
  window.addEventListener('resize', onWindowResize, false)

  const mouse = new THREE.Vector2()
  function onDocumentMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  document.addEventListener('mousemove', onDocumentMouseMove, false);


  //HERO FUNCTIONALITY ----------------------------------------------------------------------------------------------------
  let hoverHeight = {
    normal: 40,
    normalMax: 225,
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
    gsap.to(dustMesh.position, { duration: 5.5, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
    gsap.to(dustMesh2.position, { duration: 12, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
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
    gsap.to(heroCamera.rotation, { duration: 7, ease: 'power1.out', y: mouse.x * maxRotation * 0.001 * -1 })
  }

  const updateRotors = () => {
    if (rotor1.rotation.y > 360) rotor1.rotation.y = 0
    if (rotor2.rotation.y > 360) rotor2.rotation.y = 0
    rotor1.rotation.y += 0.3
    rotor2.rotation.y -= 0.4
  }

  //HERO FUNCTIONALITY ----------------------------------------------------------------------------------------------------

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
  const render = () => heroRenderer.render(heroScene, heroCamera)
  const renderLoop = () => {
    if (isHeroRendering) {
      update()
      modelReady && render()
      requestAnimationFrame( renderLoop )
    }
  }

  init()
  renderLoop()
