class Template {
    constructor() {
        this.point = document.querySelector('svg > circle')
        this.velocity = document.querySelector('svg > #velocity')
        this.negative = document.querySelector('svg > #negative')

        this.inMass = document.getElementById('mass')
        this.inSticky = document.getElementById('sticky')
        this.inVelocity = document.getElementById('velocity')
        this.inDirection = document.getElementById('direction')
        this.inCharge = document.getElementById('charge')

        this.inMass.addEventListener('input', () => this.updateMass())
        this.inSticky.addEventListener('input', () => this.updateSticky())
        this.inVelocity.addEventListener('input', () => this.updateVelocity())
        this.inDirection.addEventListener('input', () => this.updateVelocity())
        this.inCharge.addEventListener('input', () => this.updateCharge())

        this.updateMass()
        this.updateVelocity()
        this.updateCharge()
        this.updateSticky()
    }

    getColor(charge) {
        let absCharge = Math.abs(charge)
        let red = 5.1, green = 5.1  // 255 / 50 (50 is half of the input range)
        if (absCharge > 50) {
            red *= 50
            green *= absCharge - 50
        } else {
            red *= absCharge
            green *= 0
        }
        red = Math.round(red).toString(16)
        if (red.length == 1) red = '0' + red
        green = Math.round(green).toString(16)
        if (green.length == 1) green = '0' + green
        let blue = Math.round(255 - absCharge * 2.5).toString(16)
        if (blue.length == 1) blue = '0' + blue
        return '#' + red + green + blue
    }

    updateMass() {
        let r = this.inMass.value / 10
        this.point.setAttribute('r', r)
        this.negative.setAttribute('x1', 50 - r)
        this.negative.setAttribute('x2', 50 + r)
    }

    updateCharge() {
        let charge = Number(this.inCharge.value)
        let color = this.getColor(charge)
        this.point.setAttribute('fill', color)
        if (charge < 0) {
            this.negative.style.display = 'block'
        } else {
            this.negative.style.display = 'none'
        }
    }

    updateVelocity() {
        let angle = Math.PI * -this.inDirection.value / 180
        let x2 = this.inVelocity.value * Math.cos(angle) / 2 + 50
        let y2 = this.inVelocity.value * Math.sin(angle) / 2 + 50
        this.velocity.setAttribute('x2', x2)
        this.velocity.setAttribute('y2', y2)
    }

    updateSticky() {
        if (this.inSticky.checked) {
            this.point.setAttribute('stroke', 'cyan')
            this.velocity.style.display = 'none'
        } else {
            this.point.setAttribute('stroke', 'none')
            this.velocity.style.display = 'block'
        }
    }

    get() {
        let velocity = Number(this.inVelocity.value)
        let velocityX = false, velocityY = false
        if (!this.inSticky.checked) {
            let angle = Number(this.inDirection.value) * Math.PI / 180
            velocityX = velocity * Math.cos(angle)
            velocityY = - velocity * Math.sin(angle)  // y direction is down
        }
        return {
            mass: Number(this.inMass.value),
            charge: Number(this.inCharge.value),
            velocityX, velocityY,
            fill: this.point.getAttribute('fill'),
            stroke: this.point.getAttribute('stroke'),
            r: Number(this.point.getAttribute('r'))
        }
    }
}

class Point {
    constructor(x, y, props, xMax, yMax) {
        for (let [key, val] of Object.entries(props)) this[key] = val
        this.x = x, this.y = y
        this.xMax = xMax, this.yMax = yMax
    }

    draw(cx, duration) {
        this.wall()
        duration /= 1000
        this.x += this.velocityX * duration
        this.y += this.velocityY * duration
        cx.fillStyle = this.fill
        cx.lineWidth = 2
        cx.moveTo(this.x, this.y)
        cx.beginPath()
        cx.arc(this.x, this.y, this.r, 0, 2 * Math.PI) // circle
        cx.fill()
        if (this.stroke !== 'none') {
            cx.strokeStyle = this.stroke
            cx.stroke()
        }
        if (this.charge < 0) { // negative
            cx.beginPath()
            cx.strokeStyle = 'black'
            cx.moveTo(this.x + this.r, this.y)
            cx.lineTo(this.x - this.r, this.y)
            cx.stroke()
        }
    }

    wall(point, angle) {  // make sure to clear from the wall or wall like points
        if (point === undefined) {  // outer walls
            if (this.x - this.r < 0) this.x = 0 + this.r
            if (this.x + this.r > this.xMax) this.x = this.xMax - this.r
            if (this.x - this.r === 0 && this.velocityX < 0 || this.x + this.r === this.xMax && this.velocityX > 0)
                this.velocityX *= -1
            if (this.y - this.r < 0) this.y = 0 + this.r
            if (this.y + this.r > this.yMax) this.y = this.yMax - this.r
            if (this.y - this.r === 0 && this.velocityY < 0 || this.y + this.r === this.yMax && this.velocityY > 0)
                this.velocityY *= -1
        } else {  // sticky points
            let direction = Math.atan2(point.velocityY, point.velocityX) + angle // relative
            let velocity = Math.sqrt(point.velocityX ** 2 + point.velocityY ** 2)
            let velocityX = -Math.cos(direction) * velocity, velocityY = Math.sin(direction) * velocity
            direction = Math.atan2(velocityY, velocityX) - angle // after
            point.velocityX = Math.cos(direction) * velocity, point.velocityY = Math.sin(direction) * velocity
        }
    }

    separate(other, angle, distance) {  // separate overlapping points
        let difference = this.r + other.r - distance
        if (other.velocityX === false) {
            if (this.velocityX === false) return
            this.x -= difference * Math.cos(angle)
            this.y -= difference * Math.sin(angle)
        } else {
            other.x += difference * Math.cos(angle)
            other.y += difference * Math.sin(angle)
        }
        return angle
    }

    getDistAngle(other) {
        let distance = Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2)
        let angle = Math.atan2(other.y - this.y, other.x - this.x)
        return [distance, angle]
    }

    collide(other) {
        let [distance, angle] = this.getDistAngle(other)
        if (distance > this.r + other.r) return
        this.separate(other, angle, distance)
        if (this.velocityX === false) return other.velocityX !== false && this.wall(other, angle)
        else if (other.velocityX === false) return this.wall(this, angle)
        // change the coordinate system to collision angle => y-axis is collision line
        let directionThis = Math.atan2(this.velocityY, this.velocityX) - angle // relative
        let directionOther = Math.atan2(other.velocityY, other.velocityX) - angle // relative
        let velocityThis = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2)
        let velocityXThis = Math.cos(directionThis) * velocityThis, velocityYThis = Math.sin(directionThis) * velocityThis
        let velocityOther = Math.sqrt(other.velocityX ** 2 + other.velocityY ** 2)
        let velocityXOther = Math.cos(directionOther) * velocityOther, velocityYOther = Math.sin(directionOther) * velocityOther
        // X MOMENTUM CONSERVED
        let momentum = this.mass * velocityXThis + other.mass * velocityXOther
        // taking e = 1, vb2 - va2 = va1 - vb1
        let deltaV = velocityXThis - velocityXOther
        velocityXThis = (momentum - other.mass * deltaV) / (this.mass + other.mass) // after
        velocityXOther = deltaV + velocityXThis // after
        // Y velocities same, no impact, proceed to after
        velocityThis = Math.sqrt(velocityXThis ** 2 + velocityYThis ** 2)
        directionThis = Math.atan2(velocityYThis, velocityXThis) + angle
        velocityOther = Math.sqrt(velocityXOther ** 2 + velocityYOther ** 2)
        directionOther = Math.atan2(velocityYOther, velocityXOther) + angle
        this.velocityX = Math.cos(directionThis) * velocityThis, this.velocityY = Math.sin(directionThis) * velocityThis
        other.velocityX = Math.cos(directionOther) * velocityOther, other.velocityY = Math.sin(directionOther) * velocityOther
    }

    attract(other) {
        let [distance, angle] = this.getDistAngle(other)
        if (distance < this.r + other.r) return this.collide(other)
        if (Math.abs(this.x - other.x) * 6 < this.r + other.r || Math.abs(this.y - other.y) * 6 < this.r + other.r) return
        let force = 90 * this.charge * other.charge / distance ** 2
        // using coulomb's law, k=90
        let forceX = force * Math.cos(angle)
        let forceY = force * Math.sin(angle)
        if (this.velocityX !== false) {
            this.velocityX -= forceX / this.mass
            this.velocityY -= forceY / this.mass
        }
        if (other.velocityX !== false) {
            other.velocityX += forceX / other.mass
            other.velocityY += forceY / other.mass
        }
    }
}

class Collection {
    constructor() {
        this.points = []
        this.inmotion = false
        this.animate = this.animate.bind(this)
        this.template = new Template(document.getElementById('template'))
        let canvas = document.getElementById('main')
        window.addEventListener('resize', () => this.updateArea())
        canvas.addEventListener('click', event => this.add(event.layerX, event.layerY))
        let adding = false
        this.lastAdd = 0  // time of last add, to throttle
        canvas.addEventListener('mousemove', event => adding && this.add(event.layerX, event.layerY))
        canvas.addEventListener('mousedown', () => adding = true)
        canvas.addEventListener('mouseup', () => adding = false)
        this.cx = canvas.getContext('2d')
        this.updateArea()
        this.lastTime = 0
        this.speedFactor = 1
        this.interact = 'collide'
    }

    updateTemp() {  // update temperature scale
        let temperature = this.points.reduce((temp, point) => temp + Math.sqrt(point.velocityX ** 2 + point.velocityY ** 2), 0) / 10
        this.cx.fillStyle = 'yellow'
        this.cx.fillText(temperature + ' \u00B0C', 0, 10)
    }

    updateArea() {
        this.cx.canvas.width = window.innerWidth - 30
        this.cx.canvas.height = 0.7 * window.innerHeight
        for (let point of this.points) {
            point.xMax = this.cx.canvas.width
            point.yMax = this.cx.canvas.height
        }
    }

    add(x, y) {
        let now = Date.now()
        if (now - this.lastAdd < 150) return
        this.lastAdd = now
        let props = this.template.get()
        let point = new Point(x, y, props, this.cx.canvas.width, this.cx.canvas.height)
        for (let other of this.points) point[this.interact](other)
        this.points.push(point)
        point.draw(this.cx, 0)
    }

    animate(time) {
        this.cx.clearRect(0, 0, this.cx.canvas.width, this.cx.canvas.height)
        this.updateTemp()
        let length = this.points.length, iLast = length - 1
        for (let i = 0; i < iLast; i++) {
            let point = this.points[i]
            for (let j = i + 1; j < length; j++) {
                point[this.interact](this.points[j])
            }
        }
        let duration = time - this.lastTime
        duration = this.speedFactor * (duration < 50/*ms*/ ? duration : 16)
        for (let point of this.points) point.draw(this.cx, duration)
        this.lastTime = time
        if (this.inmotion) requestAnimationFrame(this.animate)
    }

    speed(factor) { // start/stop/speed up/down
        if (factor === undefined) {  // start/stop
            if (this.inmotion) {
                this.inmotion = false
            } else {
                this.inmotion = true
                requestAnimationFrame(this.animate)
            }
        } else { // speed up/down
            this.speedFactor *= factor
        }
    }
}

let collection = new Collection()
document.querySelector('#startop').addEventListener('click', () => collection.speed())
window.addEventListener('keypress', event => event.key == ' ' && collection.speed())
document.querySelector('#faster').addEventListener('click', () => collection.speed(2))
document.querySelector('#slower').addEventListener('click', () => collection.speed(.5))
document.querySelector('#contact').addEventListener('click', event => {
    if (collection.interact === 'attract') {
        collection.interact = 'collide'
        event.target.innerText = 'By charge'
    } else {
        collection.interact = 'attract'
        event.target.innerText = 'By contact'
    }
})
