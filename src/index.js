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

  //HERO VARIABLES

  let heroCamera, heroScene, heroRenderer
  let heroIngenuityController, heroShadowMesh, heroDustMesh, heroDustMesh2
  // let rotor1, rotor2

  //INSP VARIABLES

  let inspCamera, inspScene, inspRenderer
  let inspIngenuityController
  let rotor1, rotor2, rotor1Base, rotor2Base, dustMesh, dustMesh2
  const ingenuityMeshes = []

  const inspMouse = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const dustVideo = document.getElementById('dustVideo')
  dustVideo.play()

  const canvas = document.querySelector('#THREEInspContainer')
  let canvasMouse = false


  //HERO PRE-LOAD CONDITIONALS

  let isHeroRendering = true
  // let modelReady = false
  let isHeroHovering = false

  //INSP PRE-LOAD CONDITIONALS

  let isInspRendering = true
  let modelReady = false
  let isInspHovering = false
  let zoomed = false

  //SCROLLTRIGGERS

  ScrollTrigger.create({
  id: 'heroTHREE',
  trigger: '#THREEHeroContainer',
  start: 'center bottom',
  end: 'bottom top',
  onEnterBack: () => {
    isHeroRendering = true
    heroRenderLoop()
  },
  onLeave: () => {isHeroRendering = false},
  markers: true
})

ScrollTrigger.create({
  id: 'inspTHREE',
  trigger: '#inspectSection',
  start: 'top center',
  end: 'bottom center',
  onEnter: () => {
    isInspRendering = true
    inspRenderLoop()
  },
  onEnterBack: () => {
    isInspRendering = true
    inspRenderLoop()
  },
  onLeave: () => {isInspRendering = false},
  onLeaveBack: () => {isInspRendering = false},
  markers: true
})

  //INITIALIZE THREE

  function init() {

    //SCENES

    heroScene = new THREE.Scene()
    inspScene = new THREE.Scene()





    //CAMERAS

    heroCamera = new THREE.PerspectiveCamera(
      50, //65
      window.innerWidth / (window.innerHeight * 0.8),
      1,
      2400
    )
    heroCamera.position.set(0, 350, 1000)
    heroCamera.lookAt(0, 350, 0)

    inspCamera = new THREE.PerspectiveCamera(
      46, //42
      700 / 600,
      1,
      5000
    )
    inspCamera.position.set(250, 340, 500)
    inspCamera.lookAt(0, 340, 0)




    //GROUPS AND CONTROLLERS

    heroIngenuityController = new THREE.Group()
    heroScene.add(heroIngenuityController)
    heroIngenuityController.rotation.y = 0.45
    heroIngenuityController.position.y = 50

    inspIngenuityController = new THREE.Group()
    inspScene.add(inspIngenuityController)
    inspIngenuityController.position.y = 210





    //MATERIALS AND TEXTURES LOADERS

    let hero360, background360, hybridMat, xRayMat

    const loaderTexture = new THREE.TextureLoader();

    const heroTextureBG = loaderTexture.load(
      '../static/textures/herobg1.jpg',
        () => {
          hero360 = new THREE.WebGLCubeRenderTarget(heroTextureBG.image.height);
          hero360.fromEquirectangularTexture(heroRenderer, heroTextureBG);
          hybridMat.envMap = hero360
          heroScene.background = hero360;
        }
    )

    const inspTextureBG = loaderTexture.load(
      '../static/textures/bgInspect3.jpg',
        () => {
          background360 = new THREE.WebGLCubeRenderTarget(inspTextureBG.image.height);
          background360.fromEquirectangularTexture(inspRenderer, inspTextureBG);
          hybridMat.envMap = background360
          inspScene.background = background360
        }
    )

    const textureINGENUITY = loaderTexture.load('../static/textures/INGENUITY_TEXTURE_BAKED_02.jpg')
    const textureShadow = loaderTexture.load('../static/textures/shadowMask4.jpg')
    const textureDust = loaderTexture.load('../static/textures/dust.jpg')
    const dustVideoTexture = new THREE.VideoTexture(dustVideo)


    hybridMat = new THREE.MeshBasicMaterial({
      color: 0xeeeeee,
      map: textureINGENUITY,
      specularMap: textureINGENUITY,
      reflectivity: 2,
      combine: THREE.AddOperation,
      fog: false
    })

    xRayMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: textureINGENUITY,
      transparent: true,
      opacity: 0.4,
      fog: false
    })

    const inspDustMat =  new THREE.MeshBasicMaterial(
        {
          map: textureDust,
          alphaMap: dustVideoTexture,
          opacity: 1,
          transparent: true,
          fog: false,
        }
      )

    const heroDustMat =  new THREE.MeshBasicMaterial(
      {
        map: textureDust,
        alphaMap: dustVideoTexture,
        opacity: 0.7,
        transparent: true,
        fog: false,
        depthWrite: false,
        depthTest: false
      }
    )

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






    //MODEL LOADERS

    const loaderGLTF = new GLTFLoader()
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( 'src/draco/' );
    loaderGLTF.setDRACOLoader( dracoLoader );

    loaderGLTF.load( '../static/models/ingDraco02.gltf', function ( gltf ) {
      var model = gltf.scene;
      model.scale.set(1.25, 1.25, 1.25)
      model.position.y = -50
      heroScene.add( model )
      inspScene.add( model )
      heroIngenuityController.add(model)
      // inspIngenuityController.add(model)
      model.traverse((o) => {
        if (o.isMesh) {
          o.material = hybridMat
          ingenuityMeshes.push(o)
        }
        if (o.name === 'rotor1') rotor1 = o
        if (o.name === 'rotor1Base') rotor1Base = o
        if (o.name === 'rotor2') rotor2 = o
        if (o.name === 'rotor2Base') rotor2Base = o
      })

      modelReady = true
    }, undefined, function ( error ) {
      console.error( error );
    } )


    const heroDustPlane = new THREE.PlaneGeometry(1000, 300, 0)
    heroDustMesh = new THREE.Mesh(heroDustPlane, heroDustMat)
    heroDustMesh.position.y = 200
    heroDustMesh.position.z = 200
    heroDustMesh.rotation.y = THREE.Math.degToRad(0)
    heroDustMesh.rotation.y = THREE.Math.degToRad(15)
    heroScene.add(heroDustMesh)

    heroDustMesh2 = new THREE.Mesh(heroDustPlane, heroDustMat)
    heroDustMesh2.position.y = 200
    heroDustMesh2.position.z = 200
    heroDustMesh2.rotation.y = THREE.Math.degToRad(0)
    heroDustMesh2.rotation.y = THREE.Math.degToRad(-15)
    heroScene.add(heroDustMesh2)

    const inspDustPlane01 = new THREE.PlaneGeometry(600, 250, 0)
    const inspDustPlane02 = new THREE.PlaneGeometry(1000, 400, 0)
    dustMesh = new THREE.Mesh(inspDustPlane01, inspDustMat)
    dustMesh.position.y = 270
    dustMesh.position.x = 225
    dustMesh.position.z = 170
    dustMesh.rotation.y = THREE.Math.degToRad(25)
    inspScene.add(dustMesh)

    dustMesh2 = new THREE.Mesh(inspDustPlane02, inspDustMat)
    dustMesh2.position.y = 260
    dustMesh2.position.x = -105
    dustMesh2.position.z = -170
    dustMesh2.rotation.y = THREE.Math.degToRad(25)
    inspScene.add(dustMesh2)

    const shadowPlane = new THREE.PlaneGeometry(1400, 1400, 10, 10)

    heroShadowMesh = new THREE.Mesh(shadowPlane, shadowMat)
    heroShadowMesh.rotation.x = THREE.Math.degToRad(-90)
    heroShadowMesh.position.y = -120
    heroScene.add(heroShadowMesh)








    //RENDERERS

    heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    heroRenderer.setPixelRatio(1)
    heroRenderer.setSize(window.innerWidth, window.innerHeight * 0.8)
    const heroContainer = document.getElementById( 'THREEHeroContainer' )
    heroContainer.appendChild(heroRenderer.domElement)

    inspRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    inspRenderer.setPixelRatio(1)
    inspRenderer.setSize(600, 500)
    const inspContainer = document.getElementById( 'THREEInspWindow' )
    inspContainer.appendChild(inspRenderer.domElement)







    const threeCanvas = inspRenderer.domElement;

    function getCanvasRelativePosition(event) {
      const rect = threeCanvas.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) * threeCanvas.width  / rect.width,
        y: (event.clientY - rect.top ) * threeCanvas.height / rect.height,
      };
    }

    const inspectSelectors = ['#solarPanel', '#rotors', '#inspectInitial', '#body', '#legs']
    const inspectCopyElements = inspectSelectors.map(selector => document.querySelector(selector))

    const switchInspectCopyElements = elementId => {
      const activeElement = inspectCopyElements.find(el => el.id === elementId)
      const inactiveElements = inspectCopyElements.filter(el => el.id !== elementId)
      activeElement.classList.add('inspectVisible')
      inactiveElements.forEach(el => el.classList.remove('inspectVisible'))
    }

    const switchInspectObjects = object => {
      if (!object) {
        ingenuityMeshes.forEach(mesh => {mesh.material = hybridMat})
        return
        }

      if (object === 'rotors') {
        const rotorGroup = [rotor1, rotor1Base, rotor2, rotor2Base]
        const otherMeshes = ingenuityMeshes.filter(mesh => !rotorGroup.includes(mesh))
        rotorGroup.forEach(mesh => {mesh.material = hybridMat})
        otherMeshes.forEach(mesh => {mesh.material = xRayMat})
        return
      }

      const otherMeshes = ingenuityMeshes.filter(mesh => mesh.name !== object.name)
      object.material = hybridMat
      otherMeshes.forEach(mesh => {mesh.material = xRayMat})
    }

    // eslint-disable-next-line complexity
    function checkIntersection() {
      raycaster.setFromCamera( inspMouse, inspCamera )
      const intersects = raycaster.intersectObject( inspIngenuityController, true )
      if ( intersects.length > 0 ) {
        let selectedObject = intersects[ 0 ].object;
        if (!selectedObject.name) selectedObject = intersects[ 1 ].object
        switch (selectedObject.name) {
          case 'body':
            switchInspectCopyElements('body')
            switchInspectObjects(selectedObject)
            break
          case 'solarPanel':
            switchInspectCopyElements('solarPanel')
            switchInspectObjects(selectedObject)
            break
          case 'legs':
            switchInspectCopyElements('legs')
            switchInspectObjects(selectedObject)
            break
          case 'rotor1':
          case 'rotor1Base':
          case 'rotor2':
          case 'rotor2Base':
            switchInspectCopyElements('rotors')
            switchInspectObjects('rotors')
            break
          default:
            switchInspectCopyElements('inspectInitial')
            switchInspectObjects(null)
        }
      } else {
        switchInspectCopyElements('inspectInitial')
        switchInspectObjects(null)
      }
    }

    function setPickPosition(event) {
      const pos = getCanvasRelativePosition(event);
      inspMouse.x = (pos.x / threeCanvas.width ) *  2 - 1;
      inspMouse.y = (pos.y / threeCanvas.height) * -2 + 1;  // note we flip Y

      checkIntersection()
    }

    canvas.addEventListener('mouseenter', () => {
      canvasMouse = true
      window.addEventListener('pointermove', setPickPosition);
    })

    canvas.addEventListener('mouseleave', () => {
      canvasMouse = false
      switchInspectCopyElements('inspectInitial')
      switchInspectObjects(null)
      window.removeEventListener('pointermove', setPickPosition);
    })

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
    gsap.to(heroIngenuityController.position, { duration: 5, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
    gsap.to(heroDustMesh.position, { duration: 5.5, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
    gsap.to(heroDustMesh2.position, { duration: 12, ease: 'power2.out', x: mouse.x * maxHorizontalPosition })
    gsap.to(hoverHeight, { duration: 5, ease: 'power2.out', mouseAmount: mouse.y * hoverHeight.mouseMax })
  }

  const updateHoverMouseRotation = () => {
    const distance = (mouse.x * maxHorizontalPosition) - heroIngenuityController.position.x
    heroIngenuityController.rotation.z = THREE.Math.degToRad(distance / -40)
  }

  const takeOff = () => {
    gsap.to(hoverHeight, { duration: 2, ease: 'power1.inOut', normal: hoverHeight.normalMax })
    gsap.to(heroIngenuityController.rotation, { duration: 4, ease: 'back.inOut(4)', y: 0 })
  }

  const hover = () => {
    isHeroHovering = true
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

  //HERO FUNCTIONALITY ----------------------------------------------------------------------------------------------------------





  //INSP FUNCTIONALITY ----------------------------------------------------------------------------------------------------

  let hoverAnim

  const startHover = () => {
    isInspHovering = true
    hoverAnim = gsap.to(inspIngenuityController.position, { duration: 4, ease: 'back.inOut(4)', y: 200, repeat: -1, yoyo: true })
  }

  const alignCamera = () => {
    inspCamera.lookAt(0, 340, 0)
    inspCamera.updateProjectionMatrix()
  }

  const cameraZoomIn = () => {
    zoomed = true
    gsap.to(inspCamera, { duration: 0.75, ease: 'power1.out', fov: 24, onUpdate: () => alignCamera() })
  }

  const cameraZoomOut = () => {
    zoomed = false
    gsap.to(inspCamera, { duration: 0.5, ease: 'power1.out', fov: 46, onUpdate: () => alignCamera() })
    gsap.to(inspCamera.position, { duration: 1.5, ease: 'power1.out', x: 250, onUpdate: () => alignCamera() })
    gsap.to(inspCamera.position, { duration: 1.5, ease: 'power1.out', y: 440, onUpdate: () => alignCamera() })
  }

  const inspUpdateCamera = () => {
    gsap.to(inspCamera.position, { duration: 1.5, ease: 'power1.out', x: 250 + inspMouse.x * 100, onUpdate: () => alignCamera() })
    gsap.to(inspCamera.position, { duration: 1.5, ease: 'power1.out', y: 440 + inspMouse.y * 220, onUpdate: () => alignCamera() })
  }

  const rotors = {multiplier: 1}
  const slowRotors = () => {gsap.to(rotors, { duration: 1.0, ease: 'power4.out', multiplier: 0.005 })}
  const fastRotors = () => {gsap.to(rotors, { duration: 1, ease: 'power4.out', multiplier: 1 })}

  const inspUpdateRotors = () => {
    if (rotor1.rotation.y > 360) rotor1.rotation.y = 0
    if (rotor2.rotation.y > 360) rotor2.rotation.y = 0
    rotor1.rotation.y += 0.3 * rotors.multiplier
    rotor2.rotation.y -= 0.4 * rotors.multiplier
  }

  const slowDust = () => {dustVideo.pause()}
  const fastDust = () => {dustVideo.play()}

  //INSP FUNCTIONALITY ----------------------------------------------------------------------------------------------------

  //POST-LOAD CONDITIONALS

  let startTakeOff = false
  let inFlight = false

  //UPDATE
  const heroUpdate = () => {
    if (modelReady && !startTakeOff) {
      setTimeout(() => {startTakeOff = true}, 1000)
      setTimeout(() => {inFlight = true}, 2000)
      takeOff()
      if (!isHeroHovering) hover()
    }

    heroIngenuityController.position.y = hoverHeight.currentX()

    if (modelReady) {
      heroShadowMesh.position.x = heroIngenuityController.position.x + -120
      heroShadowMesh.position.z = hoverHeight.currentX() - 150
      updateRotors()
    }
    if (modelReady && inFlight) {
      updateCamera()
      updateHoverMouseRotation()
      updateHoverMousePosition()
    }
  }

  //RENDER LOOP
  const heroRender = () => heroRenderer.render(heroScene, heroCamera)
  const heroRenderLoop = () => {
    if (isHeroRendering) {
      console.log('hero render')
      heroUpdate()
      modelReady && heroRender()
      requestAnimationFrame( heroRenderLoop )
    }
  }

  init()
  heroRenderLoop()


  //INSP LOOP --------------------------------------------------------------------------------------------------------------

  //UPDATE
  const inspUpdate = () => {

    if (modelReady) {
      if (!isInspHovering) startHover()
      inspUpdateRotors()
      if (canvasMouse) {
        hoverAnim.pause()
        inspUpdateCamera()
        if (!zoomed) {
          cameraZoomIn()
          slowRotors()
          slowDust()
        }
      } else {
        hoverAnim.play()
        if (zoomed) cameraZoomOut()
        fastRotors()
        fastDust()
      }
    }

  }

  //RENDER
  const inspRender = () => inspRenderer.render(inspScene, inspCamera)

  //RENDER LOOP
  const inspRenderLoop = () => {
    if (isInspRendering) {
      console.log('insp render')
      inspUpdate()
      inspRender()
      requestAnimationFrame( inspRenderLoop )
    }
  }


  // inspRenderLoop()
