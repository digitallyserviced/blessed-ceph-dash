# blessed-ceph-dash
ceph dashboard using blessed-contrib

**Please note as of this time the dashboard only works with my `lcd-display` branch of [blessed-contrib](https://github.com/xcezzz/blessed-contrib/tree/lcd-display)**

![Image of blessed-ceph-dash](./screenshot.png)

VERY very basic for the moment!

Since my Ceph cluster is on a private network and inaccessible from dev machines. The Ceph cluster POSTs data outbound.

```bash
while true; do ceph status -f json | curl -X POST -H "Content-type: application/json" -d @- http://remotehost:3004/; sleep 2; done
```
