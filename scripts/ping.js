import child_process from 'child_process';
import util from 'util';
import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { hostname } from 'os';

const HOSTS = [
  // 'ds-opa.netbird.cloud',
  'ds-opb.netbird.cloud',
  'ds-opc.netbird.cloud',
  'google.com',
  'dearstudio.dk'
]

const LOGFILE = "ping-data.json"
const BIGLOGFILE = "ping-data-log.txt"
const PINGCOUNT = 1
const PINGTIMEOUT = 2 // > 0.1
const LOOPDELAY = 1000 * 60; // 

const exec = util.promisify(child_process.exec);

const logdata = {}

exec(`touch ${LOGFILE}`);
exec(`touch ${BIGLOGFILE}`);


async function is_online(hostname, err = '', out = '') {
  // console.log('stderr:', err);
  // console.log('stdout:', out);
  if( err !== '' ){
    // console.log('is_online:', false);
    update_log(hostname, '-', 'offline')
  }else{
    // console.log('is_online:', true);
    
    // mac: PING google.com (172.217.23.110): 56 data bytes
    // lin: PING google.com (216.58.206.46) 56(84) bytes of data.

    const lines = out.split('\n');
    // console.log('lines:', lines);
    const ip = lines[0].split("PING")[1].split("(")[1].split(")")[0].trim()
    // console.log('ip:', ip);
    
    lines.forEach(line => {
      // round-trip min/avg/max/stddev = 228.148/228.148/228.148/0.000 ms
      if( line.startsWith("round-trip") || line.startsWith("rtt")){
        const stats = line.split("=")[1].trim()
        const avg = stats.split("/")[1].trim()
        // console.log('stats:', stats);
        // console.log('avg:', avg);
        update_log(hostname, ip, avg)
      }
    })
  }
}

async function update_log(host, ip, avg){
  const time = new Date().toISOString()
  logdata[host] = {
    time,
    ip,
    response: avg
  }
  appendFileSync(BIGLOGFILE, `${time}; ${host}; ${ip}; ${avg}\n`)
}

async function ping(hostname) {
  try {
    const {stdout, stderr} = await exec(`ping -c ${PINGCOUNT} -i ${PINGTIMEOUT} ${hostname}`);
    is_online(hostname, stderr, stdout)
  } catch (err) {
    is_online(hostname, err, '')
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));



async function main(){
  while(true){
    for(let i = 0; i<HOSTS.length; i++){
      await ping(HOSTS[i])
    }
    console.log("logdata", logdata)
    writeFileSync(LOGFILE, JSON.stringify(logdata, null, '  '))
    await sleep(LOOPDELAY);
  }
}

main()
