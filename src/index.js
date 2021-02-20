/* eslint-disable no-multiple-empty-lines */
/* eslint-disable default-case */
/* eslint-disable no-inner-declarations */
/* eslint-disable max-statements */
import * as THREE from 'three'
import { WEBGL } from './webgl'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import gsap from 'gsap'

const statsFPS = new Stats()
statsFPS.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( statsFPS.dom )

if (WEBGL.isWebGLAvailable()) {
  let camera, scene, renderer
  let cubeMesh, cubeBG1Mesh, cubeBG2Mesh

  function init() {
    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      10000
    )
    camera.position.set(0, 200, 1300)
    camera.lookAt(0, 0, 0)

    scene = new THREE.Scene()

    {
      const near = 1000;
      const far = 3000;
      const color = 0xf0f0f0;
      scene.fog = new THREE.Fog(color, near, far);
      scene.background = new THREE.Color(color);
    }


    const cubeGeo = new THREE.BoxGeometry(150, 150, 150)
    const texture = new THREE.TextureLoader().load( '../static/textures/brick.jpg' )
    const materialBrick = new THREE.MeshBasicMaterial( { map: texture } )
    cubeMesh = new THREE.Mesh(cubeGeo, materialBrick)
    scene.add(cubeMesh)

    const cubeBG1 = new THREE.BoxGeometry(150, 150, 150)
    const cubeBG2 = new THREE.BoxGeometry(150, 150, 150)
    cubeBG1Mesh = new THREE.Mesh(cubeBG1, materialBrick)
    cubeBG1Mesh.position.z = -500
    cubeBG2Mesh = new THREE.Mesh(cubeBG2, materialBrick)
    cubeBG2Mesh.position.z = -1200
    scene.add(cubeBG1Mesh, cubeBG2Mesh)

    var gridHelper = new THREE.GridHelper(1000, 20, 0xff0000)
    scene.add(gridHelper)

    const light = new THREE.AmbientLight( 0xffffff, 10)
    //scene.add(light)

    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    //renderer.setSize(720, 480)
    const container = document.getElementById( 'THREEContainer' )
    container.appendChild(renderer.domElement)

    window.addEventListener('resize', onWindowResize, false)

  }

  function onWindowResize() {
    // camera.aspect = window.innerWidth / window.innerHeight
    camera.aspect = 720 / 480
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
  }

  const randomPosition = () => {
    if (cubeMesh.position.x < 100 || cubeMesh.position.y < 100 || cubeMesh.position.z < 100) {
    const randomVals = [Math.random() * (15 - -15) + -15, Math.random() * (15 - -15) + -15, Math.random() * (15 - -15) + -15]
    cubeMesh.position.x += randomVals[0]
    cubeMesh.position.y += randomVals[1]
    cubeMesh.position.z += randomVals[2]
    }
  }
  //window.setInterval(randomPosition, 300)


  const animateCube = () => {
    gsap.to(cubeMesh.position, { duration: 0.75, ease: 'power2.out', x: 600 })
  }

  const button = document.getElementById( 'animateButton' )
  button.addEventListener('click', animateCube)


const mouse = new THREE.Vector2()
function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
document.addEventListener('mousemove', onDocumentMouseMove, false);

// window.setInterval(() => {
//   console.log(mouse.x * 600)
//   console.log(cubeMesh.position.x)
// }, 500)

const updateCubePosition = () => {
  //cubeMesh.position.x = mouse.x * 600
  gsap.to(cubeMesh.position, { duration: 5, ease: 'power2.out', x: mouse.x * 600 })
}


const updateCamera = () => {
  var startRotation = new THREE.Euler().copy( camera.rotation );
  camera.lookAt( cubeMesh.position );
  var endRotation = new THREE.Euler().copy( camera.rotation );
  camera.rotation.copy( startRotation );
  gsap.to(camera.rotation, { duration: 0.75, ease: 'power2.out', rotation: endRotation })
}















  const update = () => {
    updateCamera()
    updateCubePosition()
  }

  const render = () => renderer.render(scene, camera)

  const animate = () => {
    statsFPS.begin()
    update()
    render()
    statsFPS.end()
    requestAnimationFrame( animate )
  }

  init()
  animate()

} else {
  var warning = WEBGL.getWebGLErrorMessage()
  document.body.appendChild(warning)
}
