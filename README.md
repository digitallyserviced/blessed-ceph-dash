#blessed-ceph-dash
ceph dashboard using blessed-contrib


![Image of blessed-ceph-dash](./screenshot.png)

The `ceph-dash` has a few different modes for accessing Ceph cluster information.

[Usage](#usage)

[Local Ceph Cluster](#local)

[Remote Ceph Cluster - SSH](#remote)

[Dumb Dashboard](#dumb)

### Installation
```bash
npm install blessed-ceph-dash
```

#### Usage

```bash
Display statistics for the Ceph storage platform.
Usage: ceph-dash [options]

Options:
  -l, --local   Local Mode: Gather statistics if running locally to Ceph.
                Expects 'ceph' in path and authenticated. [DEFAULT]
  -r, --remote  SSH Mode: Gather statistics from specified Ceph admin machine
                via SSH. e.g --remote=servername.com
  -n, --noauto  NoAuto Mode: Do not gather statistics automatically. Used for
                when you will manually POST data to ceph-dash
  -u, --user    User for SSH authentication to Ceph admin machine
                                                               [default: "root"]
  --password    Password for SSH authentication to Ceph admin machine (NOT
                RECOMMENDED)
  -k, --key     SSH key file. (Default: ~/.ssh/id_rsa and ~/.ssh/id_dsa)
  -p, --port    Port to connect with SSH.                          [default: 22]
  -b, --bind    Port to listen on for 'ceph health -fjson' to be POSTd to.
                                                                 [default: 3004]
  -h, --help    Show usage message.
```

#### Local

From a local machine to the Ceph cluster that already has admin rights, and can run `ceph status` without additional options (default auth).

```bash
ceph-dash
```


#### Remote

From a machine that can connect to a 'Local' Ceph box over SSH. The 'Local' box we are SSHing to needs to be able to run the `ceph status` command without additional options (default auth)

```bash
ceph-dash --remote=someserver.com --port 22 --key .ssh/id_rsa
```

You could also specify `--password=PASSWORD` but obviously this is probably not a good idea as your password will now leak out.


#### Dumb

From a machine that you want to run the dashboard you will launch ceph-dash and it will listen on a public port.

```bash
ceph-dash --noauto --bind 1234
```

Then from inside your Ceph network you will POST the output of `ceph status -f json` to the machine that is running the dashboard. This method may be required for more advanced configurations and internal Ceph clusters that are inaccessible to any public methods.

```bash
while true; do 
    ceph status -f json | curl -X POST \
    	-H "Content-type: application/json" \
    	-d @- http://remotehost:1234/; 
    sleep 2; 
done
```
